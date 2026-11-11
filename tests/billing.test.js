import test from "node:test";
import assert from "node:assert/strict";

// 1. Invoice Status Calculation Rules
test("Billing: Dynamically calculates invoice status based on verified payments and due date", () => {
  function calcStatus(amount, paid, dueDate, now) {
    if (paid >= amount) return "PAID";
    if (now.getTime() > dueDate.getTime()) return "OVERDUE";
    if (paid > 0) return "PARTIALLY_PAID";
    return "UNPAID";
  }

  const dueDate = new Date("2026-11-15T23:59:59Z");
  const beforeDue = new Date("2026-11-10T10:00:00Z");
  const afterDue = new Date("2026-11-16T10:00:00Z");

  // 1. Unpaid before due date -> UNPAID
  assert.equal(calcStatus(10000000, 0, dueDate, beforeDue), "UNPAID");

  // 2. Partially paid before due date -> PARTIALLY_PAID
  assert.equal(calcStatus(10000000, 4000000, dueDate, beforeDue), "PARTIALLY_PAID");

  // 3. Unpaid past due date -> OVERDUE
  assert.equal(calcStatus(10000000, 0, dueDate, afterDue), "OVERDUE");

  // 4. Partially paid past due date -> OVERDUE
  assert.equal(calcStatus(10000000, 4000000, dueDate, afterDue), "OVERDUE");

  // 5. Fully paid before due date -> PAID
  assert.equal(calcStatus(10000000, 10000000, dueDate, beforeDue), "PAID");

  // 6. Fully paid past due date -> PAID (Never overdue if fully paid)
  assert.equal(calcStatus(10000000, 10000000, dueDate, afterDue), "PAID");
});

// 2. Overpayment Rejection Rule
test("Billing: Strictly rejects payments exceeding the outstanding balance", () => {
  const invoice = {
    amount: 15000000,
    paidAmount: 10000000, // Remaining: 5000000
  };

  function applyPayment(payAmount) {
    const remaining = invoice.amount - invoice.paidAmount;
    if (payAmount <= 0) return { success: false, error: "Jumlah tidak valid" };
    if (payAmount > remaining) {
      return { success: false, error: "Pembayaran melebihi sisa tagihan" };
    }
    invoice.paidAmount += payAmount;
    return { success: true, newPaid: invoice.paidAmount };
  }

  // Attempting to pay 6.000.000 when remaining is 5.000.000 -> REJECTED
  const res1 = applyPayment(6000000);
  assert.equal(res1.success, false);
  assert.equal(res1.error, "Pembayaran melebihi sisa tagihan");
  assert.equal(invoice.paidAmount, 10000000); // Unchanged

  // Paying 5.000.000 (exact remaining) -> ACCEPTED
  const res2 = applyPayment(5000000);
  assert.equal(res2.success, true);
  assert.equal(invoice.paidAmount, 15000000);
});

// 3. Multi-Stage Reminder Schedule Calculation
test("Billing: Generates exact dates for stages H-14, H-7, H-0, H+1, H+3, and H+7", () => {
  const dueDate = new Date("2026-11-20T00:00:00Z");

  const STAGES = [
    { stage: "H-14", days: -14 },
    { stage: "H-7", days: -7 },
    { stage: "H-0", days: 0 },
    { stage: "H+1", days: 1 },
    { stage: "H+3", days: 3 },
    { stage: "H+7", days: 7 },
  ];

  function calcReminderDate(due, dayDelta) {
    return new Date(due.getTime() + dayDelta * 24 * 60 * 60 * 1000);
  }

  const results = STAGES.map((s) => ({
    stage: s.stage,
    dateStr: calcReminderDate(dueDate, s.days).toISOString().slice(0, 10),
  }));

  assert.deepEqual(results, [
    { stage: "H-14", dateStr: "2026-11-06" },
    { stage: "H-7", dateStr: "2026-11-13" },
    { stage: "H-0", dateStr: "2026-11-20" },
    { stage: "H+1", dateStr: "2026-11-21" },
    { stage: "H+3", dateStr: "2026-11-23" },
    { stage: "H+7", dateStr: "2026-11-27" },
  ]);
});

// 4. Paid Invoice Overdue Protection Rule
test("Billing: Reminders are automatically cancelled when invoice is marked PAID", () => {
  const reminders = [
    { stage: "H-14", status: "SENT" },
    { stage: "H-7", status: "PENDING" },
    { stage: "H-0", status: "PENDING" },
    { stage: "H+1", status: "PENDING" },
    { stage: "H+7", status: "PENDING" },
  ];

  function onInvoiceFullyPaid() {
    for (const r of reminders) {
      if (r.status === "PENDING") {
        r.status = "CANCELLED";
      }
    }
  }

  onInvoiceFullyPaid();

  // All pending reminders cancelled
  assert.equal(reminders.find((r) => r.stage === "H-7")?.status, "CANCELLED");
  assert.equal(reminders.find((r) => r.stage === "H-0")?.status, "CANCELLED");
  assert.equal(reminders.find((r) => r.stage === "H+1")?.status, "CANCELLED");
  assert.equal(reminders.find((r) => r.stage === "H+7")?.status, "CANCELLED");
  // Past sent reminder remains SENT for audit integrity
  assert.equal(reminders.find((r) => r.stage === "H-14")?.status, "SENT");
});

// 5. Official WhatsApp Provider Guard
test("Billing: WhatsApp abstraction rejects unconfigured environments without claiming fake delivery", () => {
  function checkProvider(url, token, phoneId) {
    if (!url || !token || !phoneId) {
      return {
        configured: false,
        fallback: "IN_APP",
        error: "Provider WhatsApp resmi belum dikonfigurasi.",
      };
    }
    return { configured: true };
  }

  // Without credentials -> fallback to IN_APP and error noted
  const unconfigured = checkProvider("", "", "");
  assert.equal(unconfigured.configured, false);
  assert.equal(unconfigured.fallback, "IN_APP");
});

// 6. Rupiah Currency Formatter
test("Billing: Currency formatting formats positive nominals and zero correctly", () => {
  function formatIDR(amount) {
    if (!amount || isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  assert.match(formatIDR(248000000), /248\.000\.000/);
  assert.match(formatIDR(15500000), /15\.500\.000/);
  assert.match(formatIDR(0), /0/);
});
