import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/billing";
import { formatWIBDateOnly } from "@/lib/date";
import { createInvoice } from "./actions";
import {
  ReceiptText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status;

  const whereClause: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    whereClause.status = statusFilter;
  }

  const [invoices, tenants, units] = await Promise.all([
    db.invoice.findMany({
      where: whereClause,
      include: {
        tenant: true,
        unit: true,
        payments: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    db.tenant.findMany({ where: { isActive: true }, orderBy: { tenantName: "asc" } }),
    db.unit.findMany({ where: { isActive: true }, orderBy: { unitCode: "asc" } }),
  ]);

  const allInvoices = await db.invoice.findMany();
  const totalBilled = allInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCollected = allInvoices.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueCount = allInvoices.filter((i) => i.status === "OVERDUE").length;

  const canManage =
    user.roleCodes.includes("accounting") ||
    user.roleCodes.includes("manager") ||
    user.roleCodes.includes("spv");

  return (
    <div className="p-4 space-y-4">
      {/* Title & Reminders Link */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Billing & Tagihan</h2>
          <p className="text-[11px] text-appText-muted">{invoices.length} faktur tercatat</p>
        </div>

        <Link
          href="/billing/reminders"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1.5 shadow-card"
        >
          <Bell className="w-3.5 h-3.5 text-accent" />
          <span>Reminders</span>
        </Link>
      </div>

      {/* 4 Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          title="Outstanding"
          value={allInvoices.length > 0 ? formatRupiah(totalOutstanding) : "—"}
          subtitle="Saldo belum lunas"
          icon={ReceiptText}
          highlight={overdueCount > 0}
        />
        <MetricCard
          title="Terkumpul"
          value={allInvoices.length > 0 ? formatRupiah(totalCollected) : "—"}
          subtitle="Pembayaran sah"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Overdue"
          value={overdueCount}
          subtitle={overdueCount > 0 ? "Melewati batas" : "Nihil tunggakan"}
          icon={AlertTriangle}
          highlight={overdueCount > 0}
        />
        <MetricCard
          title="Total Faktur"
          value={allInvoices.length > 0 ? allInvoices.length : "—"}
          subtitle="Semua periode"
          icon={Clock}
        />
      </div>

      {/* Filter Tabs Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: "Semua", value: "ALL" },
          { label: "Unpaid", value: "UNPAID" },
          { label: "Partially Paid", value: "PARTIALLY_PAID" },
          { label: "Overdue", value: "OVERDUE" },
          { label: "Paid", value: "PAID" },
        ].map((tab) => {
          const isActive = (!statusFilter && tab.value === "ALL") || statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/billing" : `/billing?status=${tab.value}`}
              className={`px-3 py-1.5 text-xs rounded-full font-semibold whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface border border-appBorder text-appText-muted hover:text-appText"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile Invoice Cards List */}
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <EmptyState
            title="Belum Ada Invoice Tagihan"
            description="Database dimulai dalam kondisi bersih. Daftarkan tagihan sewa tenant pada form di bawah."
            icon={ReceiptText}
          />
        ) : (
          invoices.map((inv) => {
            const remaining = inv.amount - inv.paidAmount;
            return (
              <Link
                key={inv.id}
                href={`/billing/invoices/${inv.id}`}
                className="block bg-surface rounded-card border border-appBorder p-4 shadow-card hover:border-primary/40 active:bg-slate-50 transition-colors"
              >
                {/* Header: Number + Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-xs text-primary">
                    {inv.invoiceNumber}
                  </span>
                  <StatusBadge status={inv.status} size="sm" />
                </div>

                {/* Tenant & Unit */}
                <div className="mb-2.5">
                  <h4 className="text-xs font-bold text-appText">{inv.tenant.tenantName}</h4>
                  <p className="text-[11px] text-appText-muted">
                    {inv.unit ? `Unit ${inv.unit.unitCode} (${inv.unit.floor})` : "Gedung / Umum"} • Periode {inv.billingPeriod}
                  </p>
                </div>

                {/* Amount Breakdown */}
                <div className="bg-slate-50 p-2.5 rounded-control border border-appBorder text-xs space-y-1 mb-2.5">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-appText-muted">Total Tagihan:</span>
                    <span className="font-mono font-bold text-appText">{formatRupiah(inv.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-appText-muted">Sudah Dibayar:</span>
                    <span className="font-mono font-semibold text-emerald-700">{formatRupiah(inv.paidAmount)}</span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-between pt-1 border-t border-appBorder">
                      <span className="text-[11px] font-semibold text-rose-700">Sisa Tagihan:</span>
                      <span className="font-mono font-bold text-rose-700">{formatRupiah(remaining)}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Due date + Tap action */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-appText-muted">
                    Jatuh Tempo: <strong className="text-appText">{formatWIBDateOnly(inv.dueDate)}</strong>
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-0.5">
                    <span>Detail & Bayar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Mobile Form: Terbitkan Invoice Baru */}
      {canManage && (
        <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-appText">Terbitkan Invoice Baru</h3>
          </div>
          <p className="text-[11px] text-appText-muted">
            Penerbitan otomatis menjadwalkan reminder multi-tahap (H-14 s/d H+7).
          </p>

          <form action={createInvoice} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Nomor Invoice *
              </label>
              <input
                type="text"
                name="invoiceNumber"
                required
                placeholder="Contoh: INV-202611-001"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Pilih Tenant *
              </label>
              <select
                name="tenantId"
                required
                className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
              >
                <option value="">-- Pilih Perusahaan Tenant --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tenantName} ({t.contactName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Pilih Unit (Opsional)
                </label>
                <select
                  name="unitId"
                  className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
                >
                  <option value="">-- Tanpa Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unitCode} ({u.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Periode Tagihan *
                </label>
                <input
                  type="text"
                  name="billingPeriod"
                  required
                  placeholder="Contoh: Nov 2026"
                  defaultValue="November 2026"
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Nilai Tagihan (Rp) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="1000"
                  placeholder="5000000"
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Jatuh Tempo *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] mt-2 py-2.5 px-4 bg-primary text-white font-bold text-xs rounded-control hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-accent" />
              <span>Terbitkan Invoice & Jadwalkan Reminder</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
