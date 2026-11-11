import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import { dispatchReminder } from "../actions";
import {
  Bell,
  ArrowLeft,
  ShieldCheck,
  Send,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BillingRemindersPage({
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

  const reminders = await db.invoiceReminder.findMany({
    where: whereClause,
    include: {
      invoice: {
        include: { tenant: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const canManage =
    user.roleCodes.includes("accounting") ||
    user.roleCodes.includes("manager") ||
    user.roleCodes.includes("spv");

  const isWhatsAppConfigured = Boolean(
    process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
  );

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Jadwal Pengingat</h2>
          <p className="text-[11px] text-appText-muted">{reminders.length} antrian reminder</p>
        </div>
        <Link
          href="/billing"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

      {/* WhatsApp Official Provider Banner */}
      <div className="p-3 bg-slate-50 border border-appBorder rounded-card shadow-card space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-appText">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Integrasi WhatsApp Resmi</span>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              isWhatsAppConfigured
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {isWhatsAppConfigured ? "Meta Cloud API" : "In-App (Default)"}
          </span>
        </div>
        <p className="text-[10px] text-appText-muted leading-relaxed">
          Sesuai aturan keamanan bisnis, sistem tidak menggunakan gateway tidak resmi/scraping.
        </p>
      </div>

      {/* Filter Tabs Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: "Semua", value: "ALL" },
          { label: "Pending", value: "PENDING" },
          { label: "Sent", value: "SENT" },
          { label: "Cancelled", value: "CANCELLED" },
        ].map((tab) => {
          const isActive = (!statusFilter && tab.value === "ALL") || statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/billing/reminders" : `/billing/reminders?status=${tab.value}`}
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

      {/* Reminders Cards List */}
      <div className="space-y-2.5">
        {reminders.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Jadwal Pengingat"
            description="Jadwal pengingat otomatis dibuat saat invoice tagihan baru diterbitkan."
            icon={Bell}
          />
        ) : (
          reminders.map((rem) => {
            const isInvoicePaid = rem.invoice.status === "PAID";
            return (
              <div
                key={rem.id}
                className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[10px] text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                      {rem.reminderStage}
                    </span>
                    <Link
                      href={`/billing/invoices/${rem.invoiceId}`}
                      className="font-mono font-bold text-xs text-appText hover:underline"
                    >
                      {rem.invoice.invoiceNumber}
                    </Link>
                  </div>
                  <StatusBadge status={rem.status} size="sm" />
                </div>

                <div className="bg-slate-50 p-2 rounded-control border border-appBorder text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-appText">{rem.invoice.tenant.tenantName}</span>
                    <span className="text-[10px] text-appText-muted uppercase font-medium">{rem.channel}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-appText-muted">
                    <span>Tujuan: {rem.recipient}</span>
                    <span className="font-mono">{formatWIB(rem.scheduledAt)}</span>
                  </div>
                </div>

                {rem.status === "PENDING" && !isInvoicePaid && canManage && (
                  <div className="pt-1 flex justify-end">
                    <form action={dispatchReminder}>
                      <input type="hidden" name="reminderId" value={rem.id} />
                      <button
                        type="submit"
                        className="min-h-[32px] px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-control hover:bg-primary-hover shadow-xs flex items-center gap-1 active:scale-95 transition-transform"
                      >
                        <Send className="w-3 h-3 text-accent" />
                        <span>Kirim Sekarang</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
