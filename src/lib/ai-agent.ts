import { db } from "./db";
import { logAudit } from "./audit";
import { isResponseOverdue } from "./sla";

export interface AiScanResult {
  generatedCount: number;
  recommendations: Array<{
    id: string;
    module: string;
    contextType: string;
    contextId: string;
    recommendation: string;
    proposedAction: string;
    riskLevel: string;
  }>;
}

/**
 * Scans real database records and generates operational insights / recommendations
 * Strictly based on actual tickets, inventory quantities, and invoices.
 */
export async function scanOperationalInsights(actorId: string): Promise<AiScanResult> {
  const newRecommendations: Array<{
    module: string;
    contextType: string;
    contextId: string;
    recommendation: string;
    proposedAction: string;
    riskLevel: string;
  }> = [];

  const now = new Date();

  // 1. SCAN ENGINEERING TICKETS FOR SLA & ASSIGNMENT RISKS
  const openTickets = await db.ticket.findMany({
    where: {
      status: { in: ["OPEN", "ASSIGNED"] },
    },
    include: {
      location: true,
      tenant: true,
    },
  });

  for (const ticket of openTickets) {
    const isOverdue = isResponseOverdue(
      ticket.responseDueAt,
      ticket.firstResponseAt,
      now
    );

    if (isOverdue && ticket.status === "OPEN") {
      newRecommendations.push({
        module: "engineering",
        contextType: "TICKET",
        contextId: ticket.id,
        recommendation: `Tiket #${ticket.ticketNumber} (${ticket.description.slice(0, 40)}...) pada lokasi ${ticket.location?.name || "Gedung"} berstatus OPEN dan telah melampaui response threshold SLA (${ticket.priority}).`,
        proposedAction: "Eskalasikan notifikasi prioritas tinggi ke SPV dan jadwalkan penugasan segera.",
        riskLevel: ticket.priority === "EMERGENCY" ? "LEVEL_3" : "LEVEL_2",
      });
    } else if (ticket.priority === "EMERGENCY" && ticket.status === "OPEN") {
      newRecommendations.push({
        module: "engineering",
        contextType: "TICKET",
        contextId: ticket.id,
        recommendation: `Tiket #${ticket.ticketNumber} berprioritas EMERGENCY belum ditangani. Memerlukan penugasan langsung.`,
        proposedAction: "Lakukan forced reassignment teknisi standby ke tiket ini.",
        riskLevel: "LEVEL_3",
      });
    }
  }

  // 2. SCAN INVENTORY FOR ITEMS AT OR BELOW MINIMUM QUANTITY
  const activeItems = await db.inventoryItem.findMany({
    where: { isActive: true },
  });

  for (const item of activeItems) {
    if (item.quantityOnHand <= item.minimumQuantity) {
      const needed = Math.max(10, item.minimumQuantity * 2 - item.quantityOnHand);
      newRecommendations.push({
        module: "inventory",
        contextType: "INVENTORY_ITEM",
        contextId: item.id,
        recommendation: `Stok barang '${item.name}' (${item.itemCode}) tersisa ${item.quantityOnHand} ${item.unitOfMeasure}, di bawah atau sama dengan batas minimum (${item.minimumQuantity} ${item.unitOfMeasure}).`,
        proposedAction: `Ajukan procurement / stock adjustment restock sebanyak ${needed} ${item.unitOfMeasure}.`,
        riskLevel: "LEVEL_3", // Level 3: Perubahan stok membutuhkan approval manusia
      });
    }
  }

  // 3. SCAN BILLING FOR CRITICAL OVERDUE INVOICES (> 7 DAYS)
  const overdueInvoices = await db.invoice.findMany({
    where: {
      status: "OVERDUE",
    },
    include: {
      tenant: true,
      unit: true,
    },
  });

  for (const inv of overdueInvoices) {
    const daysOverdue = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue >= 7) {
      newRecommendations.push({
        module: "billing",
        contextType: "INVOICE",
        contextId: inv.id,
        recommendation: `Faktur #${inv.invoiceNumber} (Tenant: ${inv.tenant.tenantName}) telah menunggak selama ${daysOverdue} hari melewati tanggal jatuh tempo.`,
        proposedAction: "Eskalasikan surat penagihan dan notifikasi teguran keras ke Building Manager.",
        riskLevel: "LEVEL_2",
      });
    }
  }

  // 4. ROUTINE LEVEL 1 DRAFT REPORT
  const totalTickets = await db.ticket.count();
  if (totalTickets > 0) {
    newRecommendations.push({
      module: "engineering",
      contextType: "WEEKLY_REPORT",
      contextId: "WEEKLY_REPORT_DRAFT",
      recommendation: "Data operasional mingguan tersedia untuk ditinjau oleh SPV.",
      proposedAction: "Siapkan draft weekly report format PDF/CSV untuk verifikasi SPV.",
      riskLevel: "LEVEL_1",
    });
  }

  // Save new recommendations to database with deduplication
  const createdRecs = [];

  for (const rec of newRecommendations) {
    const existing = await db.aiRecommendation.findFirst({
      where: {
        module: rec.module,
        contextType: rec.contextType,
        contextId: rec.contextId,
        status: "PENDING",
      },
    });

    if (!existing) {
      const created = await db.aiRecommendation.create({
        data: {
          module: rec.module,
          contextType: rec.contextType,
          contextId: rec.contextId,
          recommendation: rec.recommendation,
          proposedAction: rec.proposedAction,
          riskLevel: rec.riskLevel,
          status: "PENDING",
        },
      });

      if (rec.riskLevel === "LEVEL_3") {
        await db.approvalRequest.create({
          data: {
            aiRecommendationId: created.id,
            actionType:
              rec.module === "inventory"
                ? "STOCK_ADJUSTMENT"
                : rec.contextType === "TICKET"
                ? "TICKET_PRIORITY"
                : "REASSIGNMENT",
            targetType: rec.contextType,
            targetId: rec.contextId,
            requestedBy: actorId,
            status: "PENDING",
          },
        });
      }

      createdRecs.push(created);
    }
  }

  if (createdRecs.length > 0) {
    await logAudit({
      actorUserId: actorId,
      actorRole: "system",
      action: "ai.scan_insights",
      module: "ai_agent",
      entityType: "ai_recommendation",
      entityId: "batch",
      afterJson: { count: createdRecs.length },
      source: "ai",
    });
  }

  return {
    generatedCount: createdRecs.length,
    recommendations: createdRecs,
  };
}

/**
 * Approve and execute an AI recommendation
 * Level 3 strictly requires human approval
 */
export async function approveAiRecommendation(
  recommendationId: string,
  approverId: string,
  approverRole: string,
  decisionNote?: string
) {
  const rec = await db.aiRecommendation.findUnique({
    where: { id: recommendationId },
    include: { approvalRequests: true },
  });

  if (!rec) {
    throw new Error("Rekomendasi AI tidak ditemukan.");
  }

  if (rec.status !== "PENDING") {
    throw new Error(`Rekomendasi sudah berstatus ${rec.status}.`);
  }

  // Level 3 verification: Must be SPV, Manager, or Direksi
  const allowedRoles = ["direksi", "manager", "spv"];
  if (rec.riskLevel === "LEVEL_3" && !allowedRoles.includes(approverRole.toLowerCase())) {
    throw new Error("Aksi Level 3 memerlukan persetujuan dari SPV, Manager, atau Direksi.");
  }

  await db.$transaction(async (tx) => {
    await tx.aiRecommendation.update({
      where: { id: recommendationId },
      data: { status: "ACCEPTED" },
    });

    if (rec.approvalRequests && rec.approvalRequests.length > 0) {
      for (const req of rec.approvalRequests) {
        if (req.status === "PENDING") {
          await tx.approvalRequest.update({
            where: { id: req.id },
            data: {
              status: "APPROVED",
              approvedBy: approverId,
              decisionNote: decisionNote || "Approved by human supervisor",
              decidedAt: new Date(),
            },
          });
        }
      }
    }

    // Record AI Action Log
    await tx.aiActionLog.create({
      data: {
        recommendationId: rec.id,
        actionType: rec.proposedAction.slice(0, 50),
        executionStatus: "SUCCESS",
        executedBy: approverId,
      },
    });
  });

  await logAudit({
    actorUserId: approverId,
    actorRole: approverRole,
    action: "ai.approve_recommendation",
    module: "ai_agent",
    entityType: "ai_recommendation",
    entityId: rec.id,
    afterJson: { riskLevel: rec.riskLevel, decisionNote },
    source: "human",
  });

  return { success: true };
}

/**
 * Reject an AI recommendation
 */
export async function rejectAiRecommendation(
  recommendationId: string,
  deciderId: string,
  deciderRole: string,
  decisionNote?: string
) {
  const rec = await db.aiRecommendation.findUnique({
    where: { id: recommendationId },
    include: { approvalRequests: true },
  });

  if (!rec) {
    throw new Error("Rekomendasi AI tidak ditemukan.");
  }

  await db.$transaction(async (tx) => {
    await tx.aiRecommendation.update({
      where: { id: recommendationId },
      data: { status: "REJECTED" },
    });

    if (rec.approvalRequests && rec.approvalRequests.length > 0) {
      for (const req of rec.approvalRequests) {
        if (req.status === "PENDING") {
          await tx.approvalRequest.update({
            where: { id: req.id },
            data: {
              status: "REJECTED",
              approvedBy: deciderId,
              decisionNote: decisionNote || "Ditolak oleh user",
              decidedAt: new Date(),
            },
          });
        }
      }
    }
  });

  await logAudit({
    actorUserId: deciderId,
    actorRole: deciderRole,
    action: "ai.reject_recommendation",
    module: "ai_agent",
    entityType: "ai_recommendation",
    entityId: rec.id,
    afterJson: { decisionNote },
    source: "human",
  });

  return { success: true };
}
