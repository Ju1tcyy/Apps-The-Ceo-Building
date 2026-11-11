import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActiveShiftName, getActiveRosterDate, formatWIB } from "@/lib/date";
import { formatRupiah } from "@/lib/billing";
import { isResponseOverdue } from "@/lib/sla";
import {
  Wrench,
  Boxes,
  ReceiptText,
  Bot,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListTodo,
  CalendarDays,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  Building,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

interface DashboardPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const resolvedParams = await searchParams;
  const requestedView = resolvedParams.view;

  // Role detection
  const isDireksiRole = user.roleCodes.includes("direksi");
  const isSpvOrManager = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");
  const isAccountingRole = user.roleCodes.includes("accounting") && !isDireksiRole && !isSpvOrManager;
  const isExecutiveView = requestedView
    ? requestedView === "executive"
    : (isDireksiRole || isAccountingRole);

  const now = new Date();

  // Parallel Real Database Queries
  const [
    tickets,
    inventoryItems,
    invoices,
    recentAudits,
    dailyTasks,
    aiRecommendations,
    shiftDefinitions,
  ] = await Promise.all([
    db.ticket.findMany({
      include: {
        location: true,
        assignedEngineer: true,
      },
    }),
    db.inventoryItem.findMany({
      where: { isActive: true },
    }),
    db.invoice.findMany({
      include: {
        tenant: true,
        unit: true,
      },
    }),
    db.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
    db.dailyTask.findMany(),
    db.aiRecommendation.findMany({
      where: { status: "PENDING" },
    }),
    db.shiftDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculations: Tickets & SLA
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const assignedTickets = tickets.filter((t) => t.status === "ASSIGNED").length;
  const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const doneTickets = tickets.filter((t) => t.status === "DONE").length;
  const verifiedTickets = tickets.filter((t) => t.status === "VERIFIED").length;

  const overdueTickets = tickets.filter((t) => {
    if (t.status === "DONE" || t.status === "VERIFIED") return false;
    return isResponseOverdue(t.responseDueAt, t.firstResponseAt, now);
  }).length;

  const respondedTickets = tickets.filter((t) => t.firstResponseAt !== null);
  const onTimeTickets = respondedTickets.filter(
    (t) => !isResponseOverdue(t.responseDueAt, t.firstResponseAt, t.firstResponseAt || now)
  );
  const slaCompliancePercent =
    respondedTickets.length > 0
      ? Math.round((onTimeTickets.length / respondedTickets.length) * 100)
      : null;

  // Calculations: Inventory
  const totalItems = inventoryItems.length;
  const lowStockItems = inventoryItems.filter(
    (item) => item.quantityOnHand <= item.minimumQuantity
  );
  const inventoryHealthPercent =
    totalItems > 0 ? Math.round(((totalItems - lowStockItems.length) / totalItems) * 100) : null;

  // Calculations: Billing
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === "PAID") return false;
    return inv.status === "OVERDUE" || (now.getTime() > inv.dueDate.getTime() && inv.paidAmount < inv.amount);
  });
  const billingCollectionPercent =
    totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : null;

  // Shift & Standby Engineer Look up
  const activeShiftName = getActiveShiftName();
  const activeRosterDate = getActiveRosterDate();
  const activeShiftDef = shiftDefinitions.find((s) => s.name === activeShiftName);

  let standbyEngineer: { name: string; email: string; isClockedIn: boolean } | null = null;

  if (activeShiftDef) {
    const rosters = await db.shiftRoster.findMany({
      where: {
        shiftDefinitionId: activeShiftDef.id,
        shiftDate: activeRosterDate,
      },
      include: {
        engineer: {
          include: {
            attendances: {
              where: { clockOutAt: null },
              take: 1,
            },
          },
        },
      },
    });

    const firstRoster = rosters[0];
    if (firstRoster && firstRoster.engineer) {
      standbyEngineer = {
        name: firstRoster.engineer.name,
        email: firstRoster.engineer.email,
        isClockedIn: firstRoster.engineer.attendances.length > 0,
      };
    }
  }

  // Quick Insights
  const quickInsights: Array<{ text: string; type: "success" | "warning" | "danger" | "info" }> = [];
  if (slaCompliancePercent !== null && slaCompliancePercent >= 90) {
    quickInsights.push({
      text: `SLA on track (${slaCompliancePercent}% compliance)`,
      type: "success",
    });
  } else if (overdueTickets > 0) {
    quickInsights.push({
      text: `${overdueTickets} tiket melewati threshold respon SLA`,
      type: "danger",
    });
  }

  if (lowStockItems.length > 0) {
    quickInsights.push({
      text: `Inventory below minimum: ${lowStockItems.length} items`,
      type: "warning",
    });
  }

  if (overdueInvoices.length > 0) {
    quickInsights.push({
      text: `${overdueInvoices.length} invoices overdue (> jatuh tempo)`,
      type: "danger",
    });
  }

  if (quickInsights.length === 0) {
    quickInsights.push({
      text: "Seluruh parameter operasional dalam batas normal.",
      type: "info",
    });
  }

  let healthScoreSum = 0;
  let healthMetricCount = 0;
  if (slaCompliancePercent !== null) {
    healthScoreSum += slaCompliancePercent;
    healthMetricCount++;
  }
  if (inventoryHealthPercent !== null) {
    healthScoreSum += inventoryHealthPercent;
    healthMetricCount++;
  }
  if (billingCollectionPercent !== null) {
    healthScoreSum += billingCollectionPercent;
    healthMetricCount++;
  }
  const overallHealth =
    healthMetricCount > 0 ? Math.round(healthScoreSum / healthMetricCount) : null;

  const buildingStatusNormal = overdueTickets === 0 && overdueInvoices.length === 0;

  return (
    <div className="p-4 space-y-4">
      {/* Top Title & View Switcher Pill */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-base font-bold text-appText">
            {isAccountingRole
              ? "Finance & Billing Dashboard"
              : isExecutiveView
              ? "Executive Dashboard"
              : "SPV Command Dashboard"}
          </h2>
          <p className="text-[11px] text-appText-muted">
            {isAccountingRole
              ? "Manajemen Tagihan & Koleksi Piutang Tenant"
              : isExecutiveView
              ? "Strategic Overview Direksi"
              : "Monitoring Operasional Gedung"}
          </p>
        </div>

        {(isDireksiRole || isSpvOrManager) && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-control">
            <Link
              href="/dashboard?view=executive"
              className={`px-2 py-1 text-[10px] font-bold rounded-control transition-colors ${
                isExecutiveView
                  ? "bg-primary text-white shadow-xs"
                  : "text-appText-muted hover:text-primary"
              }`}
            >
              Executive
            </Link>
            <Link
              href="/dashboard?view=spv"
              className={`px-2 py-1 text-[10px] font-bold rounded-control transition-colors ${
                !isExecutiveView
                  ? "bg-primary text-white shadow-xs"
                  : "text-appText-muted hover:text-primary"
              }`}
            >
              SPV
            </Link>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* EXECUTIVE DASHBOARD (SCREEN 1 MOCKUP - MOBILE-FIRST)            */}
      {/* ============================================================== */}
      {isExecutiveView ? (
        <>
          {/* 4 TOP EXECUTIVE METRICS (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            <MetricCard
              title="SLA Compliance"
              value={slaCompliancePercent !== null ? `${slaCompliancePercent}%` : "—"}
              subtitle={respondedTickets.length === 0 ? "Belum ada tiket" : "Tiket aktual"}
              icon={Wrench}
              trend={
                slaCompliancePercent !== null
                  ? { value: `${slaCompliancePercent}% On-Track`, isPositive: slaCompliancePercent >= 90 }
                  : { value: "—", isNeutral: true }
              }
            />
            <MetricCard
              title="Inventory Health"
              value={inventoryHealthPercent !== null ? `${inventoryHealthPercent}%` : "—"}
              subtitle={
                totalItems === 0
                  ? "Belum ada master item"
                  : lowStockItems.length > 0
                  ? `${lowStockItems.length} item krisis`
                  : "Semua aman"
              }
              icon={Boxes}
              trend={
                inventoryHealthPercent !== null
                  ? { value: `${inventoryHealthPercent}% Aman`, isPositive: inventoryHealthPercent >= 80 }
                  : { value: "—", isNeutral: true }
              }
            />
            <MetricCard
              title="Billing Collection"
              value={invoices.length > 0 ? formatRupiah(totalCollected) : "—"}
              subtitle={
                invoices.length === 0
                  ? "Belum ada tagihan"
                  : `${billingCollectionPercent}% terkumpul`
              }
              icon={ReceiptText}
              trend={
                billingCollectionPercent !== null
                  ? { value: `${billingCollectionPercent}% Terkumpul`, isPositive: billingCollectionPercent >= 70 }
                  : { value: "—", isNeutral: true }
              }
            />
            <MetricCard
              title="AI Agent Mode"
              value="Suggestion"
              subtitle={`${aiRecommendations.length} usulan aktif`}
              icon={Bot}
              trend={{ value: "Level 1-3", isNeutral: true }}
            />
          </div>

          {/* Operational Performance Mobile Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-appText">Operational Performance</h3>
                <p className="text-[10px] text-appText-muted">Ringkasan tiket pekerjaan fisik</p>
              </div>
              <Link
                href="/engineering"
                className="text-[11px] font-semibold text-primary hover:text-accent flex items-center gap-0.5"
              >
                <span>Detail</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {totalTickets === 0 ? (
              <EmptyState
                compact
                title="Belum Ada Data Operasional"
                description="Database dimulai dalam kondisi bersih. Masukkan tiket melalui modul Engineering untuk melihat performa."
              />
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-control">
                  <span className="text-lg font-bold text-blue-700">{openTickets}</span>
                  <p className="text-[9px] font-medium text-blue-600">Open</p>
                </div>
                <div className="p-2 bg-purple-50/60 border border-purple-100 rounded-control">
                  <span className="text-lg font-bold text-purple-700">{assignedTickets}</span>
                  <p className="text-[9px] font-medium text-purple-600">Assigned</p>
                </div>
                <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-control">
                  <span className="text-lg font-bold text-amber-700">{inProgressTickets}</span>
                  <p className="text-[9px] font-medium text-amber-600">In Progress</p>
                </div>
                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-control">
                  <span className="text-lg font-bold text-emerald-700">{doneTickets + verifiedTickets}</span>
                  <p className="text-[9px] font-medium text-emerald-600">Selesai</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Insights Mobile Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <h3 className="text-xs font-bold text-appText">Quick Insights</h3>
              </div>
              <Link
                href="/ai-agent"
                className="text-[11px] font-semibold text-primary hover:text-accent flex items-center gap-0.5"
              >
                <span>Lihat AI</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {quickInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                      insight.type === "success"
                        ? "bg-emerald-500"
                        : insight.type === "warning"
                        ? "bg-amber-500"
                        : insight.type === "danger"
                        ? "bg-rose-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <span className="text-appText text-[11px] leading-tight font-medium">
                    {insight.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Module Overview Mobile Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-appText">Module Health</h3>
              {overallHealth !== null && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                  {overallHealth}% Overall
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-appText font-medium">Engineering (SLA)</span>
                  <span className="font-bold text-primary">
                    {slaCompliancePercent !== null ? `${slaCompliancePercent}%` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${slaCompliancePercent ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-appText font-medium">Inventory (Stok Aman)</span>
                  <span className="font-bold text-primary">
                    {inventoryHealthPercent !== null ? `${inventoryHealthPercent}%` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${inventoryHealthPercent ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-appText font-medium">Billing (Terkumpul)</span>
                  <span className="font-bold text-primary">
                    {billingCollectionPercent !== null ? `${billingCollectionPercent}%` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full"
                    style={{ width: `${billingCollectionPercent ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Building Status Mobile Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-control bg-slate-100 flex items-center justify-center text-primary">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-appText">The CEO Building</h4>
                <p className="text-[10px] text-appText-muted">Tower Operations</p>
              </div>
            </div>
            <div
              className={`px-2.5 py-1 rounded-control text-[10px] font-bold flex items-center gap-1 border ${
                buildingStatusNormal
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{buildingStatusNormal ? "Normal" : "Perhatian"}</span>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================== */
        /* SPV COMMAND DASHBOARD (SCREEN 2 MOCKUP - MOBILE-FIRST)         */
        /* ============================================================== */
        <>
          {/* 4 TOP OPERATIONAL METRICS (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            <MetricCard
              title="Open Tickets"
              value={openTickets}
              subtitle={openTickets === 0 ? "Semua ter-assign" : "Perlu penugasan"}
              icon={Wrench}
              highlight={openTickets > 0}
            />
            <MetricCard
              title="Overdue (SLA)"
              value={overdueTickets}
              subtitle={overdueTickets === 0 ? "Sesuai SLA" : "Eskalasi ke SPV"}
              icon={AlertTriangle}
              highlight={overdueTickets > 0}
            />
            <MetricCard
              title="In Progress"
              value={inProgressTickets}
              subtitle="Pekerjaan lapangan"
              icon={Clock}
            />
            <MetricCard
              title="Today's Tasks"
              value={dailyTasks.filter((t) => t.status !== "COMPLETED").length}
              subtitle="Tugas teknisi"
              icon={ListTodo}
            />
          </div>

          {/* Ticket Status Breakdown Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-appText">Ticket Status</h3>
                <p className="text-[10px] text-appText-muted">Distribusi status tiket saat ini</p>
              </div>
              <Link
                href="/engineering"
                className="text-[11px] font-semibold text-primary hover:text-accent flex items-center gap-0.5"
              >
                <span>Kelola</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {totalTickets === 0 ? (
              <EmptyState
                compact
                title="Belum Ada Tiket Tercatat"
                description="Database dimulai dalam kondisi bersih."
                action={{
                  label: "+ Buat Tiket",
                  href: "/engineering/tickets/new",
                }}
              />
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-control">
                  <span className="text-lg font-bold text-blue-700">{openTickets}</span>
                  <p className="text-[9px] font-medium text-blue-600">Open</p>
                </div>
                <div className="p-2 bg-purple-50/60 border border-purple-100 rounded-control">
                  <span className="text-lg font-bold text-purple-700">{assignedTickets}</span>
                  <p className="text-[9px] font-medium text-purple-600">Assigned</p>
                </div>
                <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-control">
                  <span className="text-lg font-bold text-amber-700">{inProgressTickets}</span>
                  <p className="text-[9px] font-medium text-amber-600">In Progress</p>
                </div>
                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-control">
                  <span className="text-lg font-bold text-emerald-700">{doneTickets}</span>
                  <p className="text-[9px] font-medium text-emerald-600">Done</p>
                </div>
              </div>
            )}
          </div>

          {/* SLA Performance Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-appText">SLA Response Performance</h3>
              <p className="text-[10px] text-appText-muted">Kepatuhan respon awal tiket</p>
              <span className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{slaCompliancePercent !== null ? `${slaCompliancePercent}% On Track` : "Belum Ada Data"}</span>
              </span>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-accent flex items-center justify-center font-bold text-xs text-primary bg-accent/10">
              {slaCompliancePercent !== null ? `${slaCompliancePercent}%` : "—"}
            </div>
          </div>

          {/* Shift & Standby Engineer Card */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-appText">Shift & Engineer Standby</h3>
                <p className="text-[10px] text-appText-muted">{activeShiftName} ({activeRosterDate})</p>
              </div>
              <Link
                href="/engineering/roster"
                className="text-[11px] font-semibold text-primary hover:text-accent flex items-center gap-0.5"
              >
                <span>Roster</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {standbyEngineer ? (
              <div className="p-2.5 bg-slate-50 border border-appBorder rounded-control flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-appText">{standbyEngineer.name}</p>
                  <p className="text-[10px] text-appText-muted">{standbyEngineer.email}</p>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    standbyEngineer.isClockedIn
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {standbyEngineer.isClockedIn ? "Clocked In" : "Belum Clock In"}
                </span>
              </div>
            ) : (
              <div className="p-2.5 text-center bg-amber-50/50 border border-dashed border-amber-200 rounded-control">
                <p className="text-xs text-amber-900 font-medium">Belum ada roster shift ini</p>
                <Link
                  href="/engineering/roster"
                  className="inline-block mt-1 px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded-control"
                >
                  + Input Roster
                </Link>
              </div>
            )}
          </div>

          {/* Weekly Report CTA (SPV Exclusive) */}
          <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-appText">Weekly Operational Report</h4>
                <p className="text-[10px] text-appText-muted">Khusus Role SPV</p>
              </div>
            </div>
            <Link
              href="/reports"
              className="px-3 py-2 bg-accent text-primary font-bold text-xs rounded-control hover:bg-accent-hover transition-colors shadow-sm"
            >
              Export
            </Link>
          </div>
        </>
      )}

      {/* RECENT ACTIVITIES & AUDIT TRAIL */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-appText">Recent Activities</h3>
            <p className="text-[10px] text-appText-muted">Audit trail log operasional terkini</p>
          </div>
          <Link
            href="/audit-log"
            className="text-[11px] font-semibold text-primary hover:text-accent flex items-center gap-0.5"
          >
            <span>Semua</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentAudits.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Log Aktivitas"
            description="Aktivitas operasional akan terekam secara otomatis di sini."
          />
        ) : (
          <div className="divide-y divide-appBorder">
            {recentAudits.map((audit) => (
              <div key={audit.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-appText mr-1.5 text-[11px]">{audit.action}</span>
                    <span className="text-[10px] text-appText-muted">
                      ({audit.module})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-appText-muted">{formatWIB(audit.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
