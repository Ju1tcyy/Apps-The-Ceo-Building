import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import {
  createStocktakeSession,
  updateStocktakeLine,
  finalizeStocktakeSession,
} from "../actions";
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StocktakePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeSession, completedSessions] = await Promise.all([
    db.stocktakeSession.findFirst({
      where: { status: "DRAFT" },
      include: {
        starter: true,
        lines: {
          include: { item: true },
          orderBy: { item: { name: "asc" } },
        },
      },
    }),
    db.stocktakeSession.findMany({
      where: { status: "APPROVED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        starter: true,
        approver: true,
        lines: true,
      },
    }),
  ]);

  const canManage = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Stock Opname Fisik</h2>
          <p className="text-[11px] text-appText-muted">Rekonsiliasi sistem dengan fisik riil gudang</p>
        </div>
        <Link
          href="/inventory"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

      {!activeSession && canManage && (
        <form action={createStocktakeSession}>
          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>Mulai Sesi Stock Opname Baru</span>
          </button>
        </form>
      )}

      {/* Active Session Mobile View */}
      {activeSession && (
        <div className="bg-surface rounded-card border border-appBorder shadow-card p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-appBorder pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-appText">Sesi Aktif (Draft)</h3>
                <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Berjalan
                </span>
              </div>
              <p className="text-[10px] text-appText-muted mt-0.5">
                Oleh: {activeSession.starter.name} &bull; {formatWIB(activeSession.startedAt)}
              </p>
            </div>

            {canManage && (
              <form action={finalizeStocktakeSession}>
                <input type="hidden" name="sessionId" value={activeSession.id} />
                <button
                  type="submit"
                  className="min-h-[36px] px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-control hover:bg-emerald-700 shadow-sm flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finalisasi</span>
                </button>
              </form>
            )}
          </div>

          {/* Lines Cards */}
          <div className="space-y-3">
            {activeSession.lines.map((line) => {
              const variance = line.physicalQuantity - line.systemQuantity;
              return (
                <div
                  key={line.id}
                  className="p-3 bg-slate-50 border border-appBorder rounded-control space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-appBorder mr-1">
                        {line.item.itemCode}
                      </span>
                      <span className="font-bold text-appText">{line.item.name}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        variance === 0
                          ? "bg-slate-200 text-slate-700"
                          : variance > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      Selisih: {variance > 0 ? `+${variance}` : variance}
                    </span>
                  </div>

                  <form action={updateStocktakeLine} className="space-y-1.5 pt-1">
                    <input type="hidden" name="lineId" value={line.id} />
                    <div className="flex items-center gap-2">
                      <div className="w-1/2">
                        <label className="block text-[10px] text-appText-muted mb-0.5">
                          Sistem: {line.systemQuantity} {line.item.unitOfMeasure}
                        </label>
                        <input
                          type="number"
                          name="physicalQuantity"
                          min="0"
                          defaultValue={line.physicalQuantity}
                          required
                          className="w-full min-h-[36px] px-2 py-1 text-xs border border-appBorder rounded bg-white font-mono text-center font-bold"
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-[10px] text-appText-muted mb-0.5">
                          Catatan Selisih
                        </label>
                        <input
                          type="text"
                          name="note"
                          defaultValue={line.note || ""}
                          placeholder="Penyebab selisih..."
                          className="w-full min-h-[36px] px-2 py-1 text-xs border border-appBorder rounded bg-white text-[11px]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full min-h-[32px] bg-slate-200 text-appText hover:bg-slate-300 font-semibold text-[11px] rounded transition-colors"
                    >
                      Perbarui Hitungan Fisik
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Sessions */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-appText">Riwayat Stock Opname Terakhir</h3>
        {completedSessions.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Sesi Opname Selesai"
            description="Riwayat sesi opname fisik yang disetujui akan tampil di sini."
            icon={ClipboardList}
          />
        ) : (
          completedSessions.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-surface rounded-card border border-appBorder shadow-card flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-appText block text-xs">
                  Sesi #{s.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[10px] text-appText-muted">
                  Disetujui oleh: {s.approver?.name || "Manager"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {s.completedAt ? formatWIB(s.completedAt) : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
