"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  calculateInvoiceStatus,
  scheduleInvoiceReminders,
  sendOfficialWhatsAppMessage,
} from "@/lib/billing";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createInvoice(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (
    !user ||
    (!user.roleCodes.includes("accounting") &&
      !user.roleCodes.includes("manager") &&
      !user.roleCodes.includes("spv"))
  ) {
    return;
  }

  const invoiceNumber = (formData.get("invoiceNumber") as string)?.toUpperCase().trim();
  const tenantId = formData.get("tenantId") as string;
  const unitId = (formData.get("unitId") as string) || null;
  const billingPeriod = formData.get("billingPeriod") as string; // e.g. "2026-11"
  const invoiceDateStr = formData.get("invoiceDate") as string;
  const dueDateStr = formData.get("dueDate") as string;
  const amount = parseInt(formData.get("amount") as string, 10);
  const notes = (formData.get("notes") as string) || null;

  if (
    !invoiceNumber ||
    !tenantId ||
    !billingPeriod ||
    !invoiceDateStr ||
    !dueDateStr ||
    isNaN(amount) ||
    amount <= 0
  ) {
    return;
  }

  const existing = await db.invoice.findUnique({ where: { invoiceNumber } });
  if (existing) {
    return;
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const invoiceDate = new Date(`${invoiceDateStr}T09:00:00+07:00`);
  const dueDate = new Date(`${dueDateStr}T23:59:59+07:00`);

  const initialStatus = calculateInvoiceStatus(amount, 0, dueDate);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      tenantId,
      unitId: unitId && unitId !== "" ? unitId : null,
      billingPeriod,
      invoiceDate,
      dueDate,
      amount,
      paidAmount: 0,
      status: initialStatus,
      notes,
      createdBy: user.id,
    },
  });

  // Automatically schedule multi-stage reminders (H-14, H-7, H-0, H+1, H+3, H+7)
  await scheduleInvoiceReminders(invoice.id, dueDate, tenant.contactPhone);

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "INVOICE_CREATE",
    module: "billing",
    entityType: "invoice",
    entityId: invoice.id,
    afterJson: {
      invoiceNumber,
      tenant: tenant.tenantName,
      amount,
      dueDate: dueDateStr,
      billingPeriod,
    },
  });

  revalidatePath("/billing");
  revalidatePath("/dashboard");
}

export async function recordInvoicePayment(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (
    !user ||
    (!user.roleCodes.includes("accounting") &&
      !user.roleCodes.includes("manager") &&
      !user.roleCodes.includes("spv"))
  ) {
    return;
  }

  const invoiceId = formData.get("invoiceId") as string;
  const paymentAmount = parseInt(formData.get("amount") as string, 10);
  const paymentDateStr = formData.get("paymentDate") as string;
  const paymentReference = (formData.get("paymentReference") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!invoiceId || isNaN(paymentAmount) || paymentAmount <= 0) {
    return;
  }

  const paymentDate = paymentDateStr
    ? new Date(`${paymentDateStr}T12:00:00+07:00`)
    : new Date();

  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const remainingBalance = invoice.amount - invoice.paidAmount;
    if (paymentAmount > remainingBalance) {
      // Overpayment rejected: cannot pay more than the outstanding amount
      return;
    }

    const newPaidAmount = invoice.paidAmount + paymentAmount;
    const newStatus = calculateInvoiceStatus(invoice.amount, newPaidAmount, invoice.dueDate);

    // 1. Update invoice
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // 2. Create payment record
    await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentDate,
        paymentReference,
        recordedBy: user.id,
        notes,
      },
    });

    // 3. If fully paid, cancel all pending future reminders to prevent sending overdue reminders to paid invoices
    if (newStatus === "PAID") {
      await tx.invoiceReminder.updateMany({
        where: {
          invoiceId: invoice.id,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });
    }

    // 4. Log audit trail
    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "INVOICE_PAYMENT_RECORD",
      module: "billing",
      entityType: "invoice",
      entityId: invoice.id,
      beforeJson: { paidAmount: invoice.paidAmount, status: invoice.status },
      afterJson: {
        paymentAmount,
        newPaidAmount,
        newStatus,
        paymentReference,
      },
    });
  });

  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
}

export async function dispatchReminder(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const reminderId = formData.get("reminderId") as string;
  if (!reminderId) return;

  const reminder = await db.invoiceReminder.findUnique({
    where: { id: reminderId },
    include: {
      invoice: {
        include: { tenant: true },
      },
    },
  });

  if (!reminder || reminder.status !== "PENDING") return;

  // Strict rule: If invoice is already PAID, do NOT send reminder
  if (reminder.invoice.status === "PAID") {
    await db.invoiceReminder.update({
      where: { id: reminder.id },
      data: { status: "CANCELLED" },
    });
    return;
  }

  // Attempt official WhatsApp delivery if configured
  const messageText = `Halo ${reminder.invoice.tenant.tenantName}, ini adalah pengingat resmi tagihan The CEO Building periode ${reminder.invoice.billingPeriod} dengan status tahap ${reminder.reminderStage}. Jatuh tempo: ${reminder.invoice.dueDate.toLocaleDateString("id-ID")}.`;

  const waResult = await sendOfficialWhatsAppMessage(reminder.recipient, messageText);

  if (waResult.success) {
    await db.invoiceReminder.update({
      where: { id: reminder.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerReference: waResult.messageId,
      },
    });
  } else {
    // If WhatsApp official credentials are not available, record as In-App notification sent
    await db.invoiceReminder.update({
      where: { id: reminder.id },
      data: {
        status: "SENT",
        channel: "IN_APP",
        sentAt: new Date(),
        errorMessage: waResult.error ? `Kanal In-App Aktif (${waResult.error})` : null,
      },
    });
  }

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "INVOICE_REMINDER_DISPATCH",
    module: "billing",
    entityType: "invoice_reminder",
    entityId: reminder.id,
    afterJson: {
      invoiceNumber: reminder.invoice.invoiceNumber,
      stage: reminder.reminderStage,
      status: "SENT",
    },
  });

  revalidatePath(`/billing/invoices/${reminder.invoiceId}`);
  revalidatePath("/billing/reminders");
  revalidatePath("/billing");
}
