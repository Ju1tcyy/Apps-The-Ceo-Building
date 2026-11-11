import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/billing";
import { formatWIB, formatWIBDateOnly } from "@/lib/date";
import { recordInvoicePayment, dispatchReminder } from "../../actions";
import {
  ReceiptText,
  ArrowLeft,
  CheckCircle2,
  Bell,
  CreditCard,
  Send,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await params;
  const invoice = await db.invoice.findUnique({
    where: { id: resolvedParams.id },
    include: {
      tenant: true,
      unit: true,
      creator: true,
      payments: {
        orderBy: { paymentDate: "desc" },
        include: { recorder: true },
      },
      reminders: {
        orderBy: { scheduledAt: "asc" },
      },
    },
  });

  if (!invoice) notFound();

  const remainingBalance = invoice.amount - invoice.paidAmount;
  const isPaid = invoice.status === "PAID" || remainingBalance <= 0;

  const canManage =
    user.roleCodes.includes("accounting") ||
    user.roleCodes.includes("manager") ||
    user.roleCodes.includes("spv");

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Rincian Invoice</h2>
          <p className="text-[11px] text-appText-muted">{invoice.invoiceNumber}</p>
        </div>
        <Link
          href="/billing"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

      {/* Invoice Details Card */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-appBorder pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-appText">{invoice.tenant.tenantName}</h3>
            <p className="text-[11px] text-appText-muted">
              {invoice.unit ? `Unit ${invoice.unit.unitCode} (${invoice.unit.floor})` : "Gedung/Umum"}
            </p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-appText-muted block">Periode:</span>
            <span className="font-semibold text-appText">{invoice.billingPeriod}</span>
          </div>
          <div>
            <span className="text-[10px] text-appText-muted block">Batas Jatuh Tempo:</span>
            <span className="font-bold text-rose-700">{formatWIBDateOnly(invoice.dueDate)}</span>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="bg-slate-50 p-2.5 rounded-control border border-appBorder space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-appText-muted">Total Tagihan:</span>
            <span className="font-mono font-bold text-appText">{formatRupiah(invoice.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-appText-muted">Terbayar:</span>
            <span className="font-mono font-semibold text-emerald-700">{formatRupiah(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-appBorder font-bold">
            <span className="text-rose-700">Sisa Tagihan:</span>
            <span className="font-mono text-rose-700">{formatRupiah(remainingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Record Payment Form */}
      {canManage && (
        <div className="bg-surface rounded-card border border-appBorder shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-appText">Catat Pembayaran Masuk</h3>
          </div>

          {isPaid ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-control text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Tagihan ini sudah lunas (PAID). Seluruh sisa reminder masa depan otomatis dibatalkan.</span>
            </div>
          ) : (
            <form action={recordInvoicePayment} className="space-y-3 text-xs">
              <input type="hidden" name="invoiceId" value={invoice.id} />

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Nominal Pembayaran (Rp) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  max={remainingBalance}
                  defaultValue={remainingBalance}
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white font-mono text-sm font-bold text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">
                    Metode Bayar *
                  </label>
                  <select
                    name="paymentMethod"
                    required
                    className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                    <option value="CHEQUE">Giro / Cek</option>
                    <option value="CASH">Tunai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">
                    No. Referensi Bank
                  </label>
                  <input
                    type="text"
                    name="paymentReference"
                    placeholder="BCA-TRX-123"
                    className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 text-white rounded-control text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Pembayaran & Rekonsiliasi</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-appText">Riwayat Pembayaran</h3>
        {invoice.payments.length === 0 ? (
          <p className="text-[11px] text-appText-muted bg-surface p-3 rounded-card border border-appBorder">
            Belum ada pembayaran yang dicatat untuk invoice ini.
          </p>
        ) : (
          invoice.payments.map((p) => (
            <div
              key={p.id}
              className="p-3 bg-surface rounded-card border border-appBorder shadow-card flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-emerald-700 block text-xs">
                  {formatRupiah(p.amount)}
                </span>
                <span className="text-[10px] text-appText-muted">Ref: {p.paymentReference || p.notes || "Transfer"}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{formatWIB(p.paymentDate)}</span>
            </div>
          ))
        )}
      </div>

      {/* Reminder Schedule */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-appText">Jadwal Pengingat (Multi-Tahap)</h3>
        </div>

        <div className="divide-y divide-appBorder">
          {invoice.reminders.map((rem) => (
            <div key={rem.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-mono font-bold text-[10px] text-primary px-1.5 py-0.2 bg-primary/10 rounded">
                    {rem.reminderStage}
                  </span>
                  <StatusBadge status={rem.status} size="sm" />
                </div>
                <p className="text-[10px] text-appText-muted">
                  {formatWIB(rem.scheduledAt)} • {rem.channel}
                </p>
              </div>

              {rem.status === "PENDING" && !isPaid && canManage && (
                <form action={dispatchReminder}>
                  <input type="hidden" name="reminderId" value={rem.id} />
                  <button
                    type="submit"
                    className="min-h-[32px] px-2.5 py-1 bg-slate-100 hover:bg-primary hover:text-white border border-appBorder text-appText text-[10px] font-semibold rounded transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Kirim</span>
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
