import { db } from "./db";
import { isResponseOverdue } from "./sla";
import { getJakartaTime } from "./date";

export interface OperationalNotification {
  id: string;
  category: "sla_overdue" | "low_stock" | "invoice_overdue" | "pending_approval" | "unassigned_ticket";
  title: string;
  description: string;
  severity: "urgent" | "warning" | "info";
  href: string;
  timestamp: Date;
}

/**
 * Aggregates real-time operational alerts from across the database
 * Strict zero dummy data: only generates notifications from real records in the database.
 */
export async function getOperationalNotifications(): Promise<OperationalNotification[]> {
  const notifications: OperationalNotification[] = [];

  // 1. Check for SLA response overdue tickets (or unassigned open tickets)
  const openTickets = await db.ticket.findMany({
    where: {
      status: { in: ["OPEN", "ASSIGNED"] },
    },
    include: { location: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const t of openTickets) {
    if (t.responseDueAt && isResponseOverdue(t.responseDueAt, t.firstResponseAt)) {
      notifications.push({
        id: `sla-${t.id}`,
        category: "sla_overdue",
        title: `SLA Respon Terlewat: ${t.ticketNumber}`,
        description: `Tiket prioritas ${t.priority} di ${t.location.name} belum mendapatkan respon pertama dalam batas waktu.`,
        severity: "urgent",
        href: `/engineering/tickets/${t.id}`,
        timestamp: t.responseDueAt,
      });
    } else if (t.status === "OPEN" && !t.assignedEngineerId) {
      notifications.push({
        id: `unassigned-${t.id}`,
        category: "unassigned_ticket",
        title: `Tiket Menunggu Penugasan: ${t.ticketNumber}`,
        description: `Tiket ${t.category} di ${t.location.name} memerlukan penugasan teknisi standby oleh SPV.`,
        severity: "warning",
        href: `/engineering/tickets/${t.id}`,
        timestamp: t.createdAt,
      });
    }
  }

  // 2. Check for low inventory stock
  const allItems = await db.inventoryItem.findMany({
    where: { isActive: true },
  });

  const lowStockItems = allItems.filter(
    (item) => item.quantityOnHand <= item.minimumQuantity
  );

  for (const item of lowStockItems) {
    notifications.push({
      id: `stock-${item.id}`,
      category: "low_stock",
      title: `Stok Kritis: ${item.name}`,
      description: `Sisa stok ${item.quantityOnHand} ${item.unitOfMeasure} (di bawah minimum ${item.minimumQuantity} ${item.unitOfMeasure}).`,
      severity: item.quantityOnHand === 0 ? "urgent" : "warning",
      href: "/inventory",
      timestamp: item.updatedAt,
    });
  }

  // 3. Check for pending AI Level 3 approval requests
  const pendingApprovals = await db.approvalRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const app of pendingApprovals) {
    notifications.push({
      id: `approval-${app.id}`,
      category: "pending_approval",
      title: `Persetujuan Dibutuhkan: ${app.actionType}`,
      description: `Aksi Level 3 untuk ${app.targetType} (${app.targetId}) memerlukan persetujuan Manager/Direksi.`,
      severity: "urgent",
      href: "/ai-agent",
      timestamp: app.createdAt,
    });
  }

  // 4. Check for overdue invoices
  const now = new Date();
  const overdueInvoices = await db.invoice.findMany({
    where: {
      status: { in: ["ISSUED", "UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
      dueDate: { lt: now },
    },
    include: { tenant: true },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  for (const inv of overdueInvoices) {
    const remaining = inv.amount - inv.paidAmount;
    if (remaining > 0) {
      notifications.push({
        id: `inv-${inv.id}`,
        category: "invoice_overdue",
        title: `Tagihan Jatuh Tempo: ${inv.invoiceNumber}`,
        description: `Tenant ${inv.tenant.tenantName} memiliki sisa tagihan yang telah melewati tanggal jatuh tempo.`,
        severity: "warning",
        href: `/billing/invoices/${inv.id}`,
        timestamp: inv.dueDate,
      });
    }
  }

  // Sort newest / highest severity first
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
