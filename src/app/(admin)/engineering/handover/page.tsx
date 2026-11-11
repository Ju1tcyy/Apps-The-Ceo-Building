import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import { createShiftHandover } from "./actions";
import { ArrowLeftRight, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ShiftHandoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [handovers, activeTickets, engineers] = await Promise.all([
    db.shiftHandover.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ticket: true,
        fromEngineer: true,
        toEngineer: true,
      },
    }),
    db.ticket.findMany({
      where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { code: "engineer" } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-appText">Serah Terima Shift (Handover)</h2>
        <p className="text-[11px] text-appText-muted">Dokumentasi kelanjutan tiket pekerjaan antar-shift</p>
      </div>

      {/* Handover Cards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-appText">Catatan Serah Terima Terkini</h3>
        {handovers.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Catatan Serah Terima"
            description="Catatan handover tiket antar shift akan tampil di sini."
            icon={ArrowLeftRight}
          />
        ) : (
          handovers.map((h) => (
            <div key={h.id} className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2.5">
              <div className="flex items-center justify-between border-b border-appBorder pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-primary">
                    {h.ticket.ticketNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-appText">({h.ticket.category})</span>
                </div>
                <span className="text-[10px] font-mono text-appText-muted">{formatWIB(h.createdAt)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-control border border-appBorder">
                <div>
                  <span className="text-[10px] text-appText-muted block">Dari:</span>
                  <span className="font-bold text-appText text-[11px]">{h.fromEngineer.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-appText-muted block">Kepada:</span>
                  <span className="font-bold text-appText text-[11px]">
                    {h.toEngineer ? h.toEngineer.name : "Shift Berikutnya"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p>
                  <strong className="text-appText text-[11px]">Kondisi:</strong>{" "}
                  <span className="text-appText-muted text-[11px]">{h.conditionSummary}</span>
                </p>
                <p>
                  <strong className="text-appText text-[11px]">Selesai:</strong>{" "}
                  <span className="text-appText-muted text-[11px]">{h.completedWork}</span>
                </p>
                <p>
                  <strong className="text-appText text-[11px]">Tersisa:</strong>{" "}
                  <span className="text-appText-muted text-[11px]">{h.remainingWork}</span>
                </p>
                {h.riskNotes && (
                  <p className="text-amber-800 text-[11px]">
                    <strong>Perhatian:</strong> {h.riskNotes}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Create Handover */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-appText">Buat Catatan Serah Terima Baru</h3>
        </div>

        {activeTickets.length === 0 ? (
          <p className="text-xs text-appText-muted">
            Tidak ada tiket berstatus terbuka/aktif yang membutuhkan serah terima.
          </p>
        ) : (
          <form action={createShiftHandover} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Pilih Tiket Pekerjaan *
              </label>
              <select
                name="ticketId"
                required
                className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
              >
                <option value="">-- Pilih Tiket --</option>
                {activeTickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticketNumber} - {t.category} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Serahkan Kepada (Opsional)
              </label>
              <select
                name="toEngineerId"
                className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
              >
                <option value="">Standby Shift Berikutnya</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Kondisi Terakhir *
              </label>
              <input
                type="text"
                name="conditionSummary"
                required
                placeholder="Contoh: AC sudah dibongkar, blower kotor"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Pekerjaan yang Sudah Dilakukan *
              </label>
              <textarea
                name="completedWork"
                required
                rows={2}
                placeholder="Pembersihan filter dan pengecekan freon..."
                className="w-full px-3 py-2 border border-appBorder rounded-control bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Pekerjaan yang Masih Tersisa *
              </label>
              <textarea
                name="remainingWork"
                required
                rows={2}
                placeholder="Penggantian kapasitor fan outdoor..."
                className="w-full px-3 py-2 border border-appBorder rounded-control bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Catatan Risiko / Safety (Opsional)
              </label>
              <input
                type="text"
                name="riskNotes"
                placeholder="Contoh: MCB nomor 4 harus tetap dimatikan"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 px-4 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm active:scale-95 transition-transform"
            >
              Simpan Catatan Handover
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
