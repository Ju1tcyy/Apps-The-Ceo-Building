import { db } from "./db";
import { logAudit } from "./audit";

/**
 * Currency formatting for Indonesian Rupiah
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Dynamic calculation of invoice payment status based on verified payments and due date
 */
export function calculateInvoiceStatus(
  amount: number,
  paidAmount: number,
  dueDate: Date,
  now: Date = new Date()
): "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "UNPAID" {
  if (paidAmount >= amount) {
    return "PAID";
  }
  const isPastDue = now.getTime() > dueDate.getTime();
  if (isPastDue) {
    return "OVERDUE";
  }
  if (paidAmount > 0) {
    return "PARTIALLY_PAID";
  }
  return "UNPAID";
}

type ReminderStageDef =
  | { stage: string; daysBefore: number }
  | { stage: string; daysAfter: number; isEscalation?: boolean };

export const REMINDER_STAGES: ReminderStageDef[] = [
  { stage: "H-14", daysBefore: 14 },
  { stage: "H-7", daysBefore: 7 },
  { stage: "H-0", daysBefore: 0 },
  { stage: "H+1", daysAfter: 1 },
  { stage: "H+3", daysAfter: 3 },
  { stage: "H+7", daysAfter: 7, isEscalation: true },
];

/**
 * Generates automated multi-stage reminder schedule for an invoice
 */
export async function scheduleInvoiceReminders(
  invoiceId: string,
  dueDate: Date,
  recipient: string
) {
  const remindersData = [];

  for (const item of REMINDER_STAGES) {
    let scheduledDate: Date;
    if ("daysBefore" in item) {
      scheduledDate = new Date(dueDate.getTime() - item.daysBefore * 24 * 60 * 60 * 1000);
    } else {
      scheduledDate = new Date(dueDate.getTime() + item.daysAfter * 24 * 60 * 60 * 1000);
    }

    // Set standard morning dispatch at 09:00 WIB
    scheduledDate.setHours(9, 0, 0, 0);

    remindersData.push({
      invoiceId,
      scheduledAt: scheduledDate,
      reminderStage: item.stage,
      channel: "IN_APP",
      recipient,
      status: "PENDING",
    });
  }

  // Create reminders in database
  for (const rem of remindersData) {
    await db.invoiceReminder.create({
      data: rem,
    });
  }
}

/**
 * Interface abstraction for official WhatsApp Meta Cloud API
 */
export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendOfficialWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // If official provider is not configured, fallback gracefully without claiming fake delivery
  if (!apiUrl || !apiToken || !phoneNumberId) {
    return {
      success: false,
      error: "Provider WhatsApp resmi belum dikonfigurasi (kredensial API belum tersedia).",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Provider error (${response.status}): ${JSON.stringify(errJson)}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messages?.[0]?.id || "wa-msg-ok",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal menghubungi API WhatsApp resmi.",
    };
  }
}
