import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, canExportWeeklyReport } from "@/lib/rbac";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB, getJakartaTime } from "@/lib/date";
import {
  FileSpreadsheet,
  Download,
  CalendarDays,
  Wrench,
  CheckCircle2,
  Boxes,
  Lock,
  ChevronRight,
  MapPin,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user.roleCodes, "report.view")) {
    return (
      <div className="p-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-800">
          Anda tidak memiliki izin (report.view) untuk melihat modul laporan.
        </div>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const now = new Date();
  const defaultTo = getJakartaTime(now).dateStr;
  const defaultFrom = getJakartaTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).dateStr;

  const fromDateStr = resolvedParams.from || defaultFrom;
  const toDateStr = resolvedParams.to || defaultTo;

  const fromDate = new Date(`${fromDateStr}T00:00:00+07:00`);
  const toDate = new Date(`${toDateStr}T23:59:59+07:00`);

  const tickets = await db.ticket.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      location: true,
      unit: true,
      assignedEngineer: true,
      consumables: {
        include: { item: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const completedTickets = tickets.filter((t) => t.status === "DONE" || t.status === "VERIFIED");
  const totalMaterialItems = tickets.reduce((acc, curr) => acc + curr.consumables.length, 0);

  const isSPV = canExportWeeklyReport(user.roleCodes);

  return (
    <div className="p-4 space-y-4">
      {/* Header & Export Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Weekly Operational Report</h2>
          <p className="text-[11px] text-appText-muted">{tickets.length} baris pekerjaan tercatat</p>
        </div>

        {isSPV ? (
          <a
            href={`/api/reports/export-weekly?from=${fromDateStr}&to=${toDateStr}`}
            download
            className="min-h-[40px] px-3.5 py-2 bg-accent text-primary font-bold text-xs rounded-control hover:bg-accent-hover shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Export CSV</span>
          </a>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 border border-appBorder rounded-control text-[10px] text-appText-muted">
            <Lock className="w-3 h-3 text-appText-muted" />
            <span>SPV Only</span>
          </div>
        )}
      </div>

      {/* Date Filter Card (Mobile Stack) */}
      <div className="p-3.5 bg-surface rounded-card border border-appBorder shadow-card space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-appText">
          <CalendarDays className="w-4 h-4 text-accent" />
          <span>Rentang Tanggal Laporan:</span>
        </div>

        <form method="GET" className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-appText-muted mb-0.5">Dari Tanggal</label>
              <input
                type="date"
                name="from"
                defaultValue={fromDateStr}
                className="w-full min-h-[40px] px-2 py-1.5 border border-appBorder rounded-control bg-white text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] text-appText-muted mb-0.5">Sampai Tanggal</label>
              <input
                type="date"
                name="to"
                defaultValue={toDateStr}
                className="w-full min-h-[40px] px-2 py-1.5 border border-appBorder rounded-control bg-white text-xs font-medium"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full min-h-[40px] bg-primary text-white font-bold text-xs rounded-control hover:bg-primary-hover shadow-sm active:scale-95 transition-transform"
          >
            Terapkan Filter Tanggal
          </button>
        </form>
      </div>

      {/* Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          title="Total Pekerjaan"
          value={tickets.length > 0 ? tickets.length : "—"}
          subtitle="Tiket periode ini"
          icon={Wrench}
        />
        <MetricCard
          title="Tuntas (Done/Verif)"
          value={tickets.length > 0 ? completedTickets.length : "—"}
          subtitle={
            tickets.length > 0
              ? `${Math.round((completedTickets.length / tickets.length) * 100)}% selesai`
              : "Belum ada tiket"
          }
          icon={CheckCircle2}
        />
      </div>

      {/* Mobile Weekly Report Cards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-appText">Daftar Pekerjaan Lapangan</h3>

        {tickets.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pekerjaan Tercatat"
            description="Tidak ada tiket gangguan atau pemeliharaan yang dibuat pada rentang tanggal yang dipilih."
            icon={FileSpreadsheet}
          />
        ) : (
          tickets.map((t, idx) => {
            let durasiStr = "—";
            if (t.doneAt && t.startedAt) {
              const diffMin = Math.round((t.doneAt.getTime() - t.startedAt.getTime()) / (1000 * 60));
              durasiStr = `${diffMin} menit`;
            }

            return (
              <div
                key={t.id}
                className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2.5"
              >
                {/* Header: No + Tanggal + Status */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-appText-muted font-bold">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {t.ticketNumber}
                    </span>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>

                {/* Pekerjaan & Lokasi */}
                <div>
                  <h4 className="text-xs font-bold text-appText">{t.category}</h4>
                  <p className="text-[11px] text-appText-muted line-clamp-2 mt-0.5">{t.description}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-control border border-appBorder text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-appText-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-accent" />
                      <span>{t.unit ? `Unit ${t.unit.unitCode} (${t.unit.floor})` : t.location.name}</span>
                    </span>
                    <span className="text-appText-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent" />
                      <span>Durasi: {durasiStr}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-appBorder">
                    <span className="text-appText-muted flex items-center gap-1">
                      <User className="w-3 h-3 text-accent" />
                      <span>PIC: {t.assignedEngineer?.name || "Belum ditugaskan"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatWIB(t.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Consumable Material Usage */}
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-appText-muted block mb-1">
                    Material Terpakai:
                  </span>
                  {t.consumables.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {t.consumables.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 bg-slate-100 text-appText rounded text-[10px] font-medium border border-slate-200"
                        >
                          {c.item.name}: {c.quantityUsed} {c.item.unitOfMeasure}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Tidak menggunakan material</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
