import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import {
  triggerAiScanAction,
  approveRecommendationAction,
  rejectRecommendationAction,
} from "./actions";
import {
  Bot,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Boxes,
  Wrench,
  ReceiptText,
  FileSpreadsheet,
  Info,
} from "lucide-react";

interface AiAgentPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AiAgentPage({ searchParams }: AiAgentPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "ALL";

  const [
    recommendations,
    actionLogs,
    pendingCount,
    approvalCount,
    executedCount,
  ] = await Promise.all([
    db.aiRecommendation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        approvalRequests: {
          include: {
            requester: true,
            decider: true,
          },
        },
        actionLogs: {
          include: {
            executor: true,
          },
        },
      },
    }),
    db.aiActionLog.findMany({
      take: 8,
      orderBy: { executedAt: "desc" },
      include: {
        recommendation: true,
        executor: true,
      },
    }),
    db.aiRecommendation.count({ where: { status: "PENDING" } }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
    db.aiRecommendation.count({ where: { status: { in: ["ACCEPTED", "EXECUTED"] } } }),
  ]);

  const filteredRecs = recommendations.filter((rec) => {
    if (filter === "LEVEL_3") return rec.riskLevel === "LEVEL_3" && rec.status === "PENDING";
    if (filter === "LEVEL_2") return rec.riskLevel === "LEVEL_2" && rec.status === "PENDING";
    if (filter === "LEVEL_1") return rec.riskLevel === "LEVEL_1" && rec.status === "PENDING";
    if (filter === "EXECUTED") return rec.status === "ACCEPTED" || rec.status === "EXECUTED";
    if (filter === "REJECTED") return rec.status === "REJECTED";
    return true;
  });

  const canApprove =
    user.roleCodes.includes("direksi") ||
    user.roleCodes.includes("spv") ||
    user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-appText">AI Agent & Intelligence</h2>
        <p className="text-[11px] text-appText-muted">
          Operational Monitoring, Risk-Classified Recommendations & Human Review
        </p>
      </div>

      {/* ============================================================== */}
      {/* BANNER: SUGGESTION / DRAFT MODE ACTIVE                          */}
      {/* ============================================================== */}
      <div className="bg-primary/5 border border-primary/20 rounded-card p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-appText">
                Suggestion & Draft Mode
              </span>
              <span className="text-[9px] bg-accent/20 text-primary border border-accent/40 font-bold px-1.5 py-0.2 rounded-full">
                Human-in-the-Loop
              </span>
            </div>
            <p className="text-[10px] text-appText-muted mt-0.5">
              Rekomendasi Level 3 (stok & penugasan) secara ketat memerlukan persetujuan manusia.
            </p>
          </div>
        </div>

        <form action={triggerAiScanAction}>
          <button
            type="submit"
            className="w-full min-h-[40px] px-3 py-2 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Pindai Data Operasional Gedung</span>
          </button>
        </form>
      </div>

      {/* ============================================================== */}
      {/* METRICS ROW (2x2 Grid)                                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          title="Active Usulan"
          value={pendingCount}
          subtitle={pendingCount === 0 ? "Tidak ada usulan" : "Menunggu review"}
          icon={Bot}
          highlight={pendingCount > 0}
        />
        <MetricCard
          title="Butuh Approval"
          value={approvalCount}
          subtitle={approvalCount === 0 ? "Antrian bersih" : "Otorisasi Level 3"}
          icon={ShieldAlert}
          highlight={approvalCount > 0}
        />
        <MetricCard
          title="Executed"
          value={executedCount}
          subtitle="Aksi dijalankan"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Otonomi"
          value="Supervised"
          subtitle="Human review"
          icon={Clock}
        />
      </div>

      {/* ============================================================== */}
      {/* RISK LEVEL LEGEND                                              */}
      {/* ============================================================== */}
      <div className="space-y-1.5 p-3 bg-surface rounded-control border border-appBorder text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-[11px] text-appText font-medium"><strong>Level 1:</strong> Draft laporan & reminder</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-[11px] text-appText font-medium"><strong>Level 2:</strong> Notifikasi eskalasi SLA & billing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
          <span className="text-[11px] text-appText font-medium"><strong>Level 3:</strong> Approval wajib (stok & reassignment)</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RECOMMENDATIONS LIST & APPROVAL WORKFLOW                        */}
      {/* ============================================================== */}
        <div className="bg-surface rounded-card border border-appBorder shadow-card overflow-hidden">
          {/* Tabs Filter (Horizontal Scroll) */}
          <div className="p-3 border-b border-appBorder flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <a
              href="/ai-agent?filter=ALL"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                filter === "ALL"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-appText hover:bg-slate-200"
              }`}
            >
              Semua ({recommendations.length})
            </a>
            <a
              href="/ai-agent?filter=LEVEL_3"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                filter === "LEVEL_3"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-appText hover:bg-slate-200"
              }`}
            >
              Approval ({approvalCount})
            </a>
            <a
              href="/ai-agent?filter=LEVEL_2"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                filter === "LEVEL_2"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-appText hover:bg-slate-200"
              }`}
            >
              Notifikasi SPV
            </a>
            <a
              href="/ai-agent?filter=EXECUTED"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                filter === "EXECUTED"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-appText hover:bg-slate-200"
              }`}
            >
              Selesai ({executedCount})
            </a>
          </div>

          {filteredRecs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Belum Ada Rekomendasi Terbuka"
                description="AI Agent secara berkala memantau database. Jalankan 'Pindai Operasional Sekarang' untuk menganalisis tiket, persediaan material, dan tagihan invoice saat ini."
                icon={Bot}
              />
            </div>
          ) : (
            <div className="divide-y divide-appBorder">
              {filteredRecs.map((rec) => {
                const isLevel3 = rec.riskLevel === "LEVEL_3";
                const isLevel2 = rec.riskLevel === "LEVEL_2";
                const isPending = rec.status === "PENDING";

                return (
                  <div key={rec.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Risk Badge */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isLevel3
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isLevel2
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {rec.riskLevel}
                        </span>

                        {/* Module Badge */}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          {rec.module === "engineering" && <Wrench className="w-3 h-3" />}
                          {rec.module === "inventory" && <Boxes className="w-3 h-3" />}
                          {rec.module === "billing" && <ReceiptText className="w-3 h-3" />}
                          <span className="capitalize">{rec.module}</span>
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            rec.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : rec.status === "ACCEPTED" || rec.status === "EXECUTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <span className="text-[11px] text-appText-muted">
                        Dihasilkan: {formatWIB(rec.createdAt)}
                      </span>
                    </div>

                    {/* Recommendation Text */}
                    <div className="mt-2 space-y-2">
                      <div className="text-sm font-semibold text-appText flex items-start gap-2">
                        <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{rec.recommendation}</span>
                      </div>
                      <div className="text-xs bg-slate-50 border border-appBorder rounded-control p-3 text-appText">
                        <span className="font-bold text-primary">Tindakan Yang Diusulkan: </span>
                        <span>{rec.proposedAction}</span>
                      </div>
                    </div>

                    {/* Approval & Action Buttons */}
                    {isPending && (
                      <div className="mt-4 pt-3 border-t border-appBorder flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-appText-muted">
                          {isLevel3 ? (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Memerlukan persetujuan manusia (SPV / Manager / Direksi).
                            </span>
                          ) : (
                            <span>Konfirmasi tindakan yang direkomendasikan sistem.</span>
                          )}
                        </div>

                        {canApprove && (
                          <div className="flex items-center gap-2">
                            {/* Reject Form */}
                            <form action={rejectRecommendationAction}>
                              <input type="hidden" name="recommendationId" value={rec.id} />
                              <button
                                type="submit"
                                className="px-3 py-1.5 border border-rose-200 text-rose-700 bg-rose-50 text-xs font-semibold rounded-control hover:bg-rose-100 transition-colors"
                              >
                                Tolak
                              </button>
                            </form>

                            {/* Approve Form */}
                            <form action={approveRecommendationAction}>
                              <input type="hidden" name="recommendationId" value={rec.id} />
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                <span>{isLevel3 ? "Setujui & Jalankan" : "Konfirmasi & Eksekusi"}</span>
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* AUDIT LOG AI ACTIONS                                           */}
        {/* ============================================================== */}
        <div className="bg-surface rounded-card border border-appBorder p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-appText">Riwayat Otorisasi & Eksekusi AI</h3>
              <p className="text-xs text-appText-muted">
                Semua keputusan manusia atas rekomendasi AI tercatat secara transparan
              </p>
            </div>
            <a
              href="/audit-log"
              className="text-xs font-semibold text-primary hover:text-accent flex items-center gap-1 transition-colors"
            >
              <span>Audit Log Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {actionLogs.length === 0 ? (
            <EmptyState
              compact
              title="Belum Ada Tindakan AI Yang Dieksekusi"
              description="Aksi yang telah disetujui dan dieksekusi akan otomatis tercatat di tabel riwayat ini."
            />
          ) : (
            <div className="divide-y divide-appBorder">
              {actionLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-appText mr-2">{log.actionType}</span>
                      <span className="text-appText-muted">
                        Eksekutor: <span className="font-medium text-appText">{log.executor.name}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-appText-muted">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                      {log.executionStatus}
                    </span>
                    <span>{formatWIB(log.executedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
