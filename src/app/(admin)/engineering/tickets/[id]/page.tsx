import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatWIB } from "@/lib/date";
import { isResponseOverdue } from "@/lib/sla";
import { updateTicketStatus, reassignTicket } from "../actions";
import {
  Wrench,
  ArrowLeft,
  Clock,
  User,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  ShieldCheck,
  RotateCcw,
  Boxes,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await params;
  const ticket = await db.ticket.findUnique({
    where: { id: resolvedParams.id },
    include: {
      location: true,
      unit: true,
      assignedEngineer: true,
      creator: true,
      consumables: {
        include: { item: true },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: true },
      },
    },
  });

  if (!ticket) notFound();

  const [engineers, inventoryItems] = await Promise.all([
    db.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { code: "engineer" } } },
      },
      orderBy: { name: "asc" },
    }),
    db.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isSPV = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");
  const isAssignedEngineer = ticket.assignedEngineerId === user.id;
  const isOverdue =
    (ticket.status === "OPEN" || ticket.status === "ASSIGNED") &&
    isResponseOverdue(ticket.responseDueAt, ticket.firstResponseAt);

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Detail Tiket</h2>
          <p className="text-[11px] text-appText-muted">{ticket.ticketNumber}</p>
        </div>
        <Link
          href="/engineering"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

        {/* Top Banner Alert if Overdue */}
        {isOverdue && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Peringatan SLA:</strong> Respon teknisi telah melewati batas toleransi response threshold ({formatWIB(ticket.responseDueAt)}). Tiket dieskalasi ke SPV.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Ticket Information Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-surface rounded-card border border-appBorder p-6 shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{ticket.ticketNumber}</span>
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={ticket.priority} size="sm" />
                </div>
                <span className="text-xs text-appText-muted font-mono">
                  Dibuat: {formatWIB(ticket.createdAt)}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-appText">{ticket.category}</h3>
                <p className="text-xs text-appText leading-relaxed mt-1 whitespace-pre-line bg-slate-50 p-3 rounded-control border border-appBorder">
                  {ticket.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-appBorder text-xs">
                <div>
                  <span className="text-[11px] text-appText-muted block">Lokasi & Lantai</span>
                  <span className="font-semibold text-appText">
                    {ticket.location.name} ({ticket.location.floor})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-appText-muted block">Pelapor</span>
                  <span className="font-semibold text-appText">{ticket.requesterName}</span>
                  <span className="text-[11px] text-appText-muted block">{ticket.requesterContact}</span>
                </div>
                <div>
                  <span className="text-[11px] text-appText-muted block">Kanal Pelaporan</span>
                  <span className="font-semibold text-primary capitalize">{ticket.source}</span>
                </div>
              </div>
            </div>

            {/* Lifecycle Action Panel */}
            <div className="bg-surface rounded-card border border-appBorder p-6 shadow-card space-y-4">
              <h4 className="text-xs font-bold text-appText uppercase tracking-wider text-appText-muted">
                Tindakan Status Pekerjaan
              </h4>

              {/* Status OPEN -> Assign */}
              {ticket.status === "OPEN" && isSPV && (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-control space-y-3">
                  <p className="text-xs text-blue-900 font-medium">
                    Tiket belum memiliki teknisi yang ditugaskan. Silakan tugaskan teknisi:
                  </p>
                  <form action={reassignTicket} className="flex gap-2">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <select
                      name="engineerId"
                      required
                      className="flex-1 px-3 py-1.5 text-xs border border-appBorder rounded-control bg-white"
                    >
                      <option value="">Pilih Teknisi</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:bg-primary-hover shadow-sm"
                    >
                      Tugaskan
                    </button>
                  </form>
                </div>
              )}

              {/* Status ASSIGNED -> Start (In Progress) */}
              {ticket.status === "ASSIGNED" && (isAssignedEngineer || isSPV) && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-control flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-900">Mulai Pekerjaan Lapangan</p>
                    <p className="text-[11px] text-amber-800">Teknisi telah tiba di lokasi dan siap memperbaiki kendala.</p>
                  </div>
                  <form action={updateTicketStatus}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="nextStatus" value="IN_PROGRESS" />
                    <input type="hidden" name="note" value="Pekerjaan dimulai oleh teknisi" />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-control hover:bg-amber-700 shadow-sm"
                    >
                      Mulai Kerjakan (In Progress)
                    </button>
                  </form>
                </div>
              )}

              {/* Status IN_PROGRESS -> Submit DONE */}
              {ticket.status === "IN_PROGRESS" && (isAssignedEngineer || isSPV) && (
                <form action={updateTicketStatus} className="p-4 bg-teal-50/60 border border-teal-200 rounded-control space-y-3">
                  <div>
                    <p className="text-xs font-bold text-teal-900">Nyatakan Pekerjaan Selesai (Submit Done)</p>
                    <p className="text-[11px] text-teal-800">
                      Pekerjaan fisik selesai dan siap diteruskan ke SPV untuk verifikasi mutu.
                    </p>
                  </div>
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <input type="hidden" name="nextStatus" value="DONE" />
                  
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                      Material / Barang Consumable Terpakai (Opsional):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        name="consumableItemId"
                        className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-appBorder rounded-control bg-white"
                      >
                        <option value="">-- Pilih Barang (Jika Ada) --</option>
                        {inventoryItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (Tersedia: {it.quantityOnHand} {it.unitOfMeasure})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        name="consumableQty"
                        min="1"
                        placeholder="Jumlah Qty"
                        className="px-2.5 py-1.5 text-xs border border-appBorder rounded-control bg-white text-center"
                      />
                    </div>
                    <p className="text-[10px] text-teal-700 mt-1">
                      Stok berkurang otomatis saat submit DONE secara atomik dan idempotent.
                    </p>
                  </div>

                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Catatan hasil perbaikan dan kondisi akhir..."
                    className="w-full px-3 py-1.5 text-xs border border-appBorder rounded-control bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-700 text-white text-xs font-bold rounded-control hover:bg-teal-800 shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Penyelesaian (Submit Done)</span>
                  </button>
                </form>
              )}

              {/* Status DONE -> SPV Verification Panel */}
              {ticket.status === "DONE" && (
                <div className="p-4 bg-slate-50 border border-appBorder rounded-control space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-appText">Verifikasi Penyelesaian oleh Supervisor (SPV)</h5>
                    <p className="text-[11px] text-appText-muted">
                      Engineer dilarang memverifikasi tiketnya sendiri. SPV memeriksa hasil pekerjaan lapangan.
                    </p>
                  </div>

                  {isSPV && !isAssignedEngineer ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Approve Verification */}
                      <form action={updateTicketStatus}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="nextStatus" value="VERIFIED" />
                        <input type="hidden" name="note" value="Pekerjaan diverifikasi dan disetujui oleh SPV" />
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-control hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Setujui (Verifikasi)</span>
                        </button>
                      </form>

                      {/* Request Rework */}
                      <form action={updateTicketStatus}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="nextStatus" value="IN_PROGRESS" />
                        <input type="hidden" name="note" value="Hasil pekerjaan belum sesuai standar. Dikembalikan untuk perbaikan ulang." />
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-rose-600 text-white text-xs font-bold rounded-control hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Minta Perbaikan Ulang</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-control text-xs text-amber-900">
                      {isAssignedEngineer
                        ? "Anda ditugaskan sebagai teknisi pada tiket ini. Sesuai aturan bisnis, verifikasi hanya dapat dilakukan oleh SPV/Manager lain."
                        : "Hanya role SPV atau Manager yang memiliki kewenangan verifikasi tiket."}
                    </div>
                  )}
                </div>
              )}

              {/* Status VERIFIED */}
              {ticket.status === "VERIFIED" && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-control flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Tiket Terverifikasi Penuh</p>
                    <p className="text-[11px] text-emerald-800">
                      Pekerjaan telah dinyatakan selesai dan terverifikasi pada {formatWIB(ticket.verifiedAt)}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div className="bg-surface rounded-card border border-appBorder p-6 shadow-card space-y-4">
              <h4 className="text-xs font-bold text-appText uppercase tracking-wider text-appText-muted flex items-center gap-1.5">
                <History className="w-4 h-4 text-accent" />
                <span>Riwayat Status & Jejak Audit Tiket</span>
              </h4>

              <div className="divide-y divide-appBorder">
                {ticket.events.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-start gap-3 text-xs">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-appText">{evt.eventType}</span>
                        <span className="text-[11px] font-mono text-appText-muted">
                          {formatWIB(evt.createdAt)}
                        </span>
                      </div>
                      <p className="text-appText-muted text-[11px] mt-0.5">
                        Oleh: <span className="font-medium text-appText">{evt.actor?.name || "System"}</span>
                      </p>
                      {evt.note && (
                        <p className="text-appText bg-slate-50 p-2 rounded border border-appBorder mt-1.5 text-[11px]">
                          {evt.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Info Column */}
          <div className="space-y-6">
            {/* SLA Info Card */}
            <div className="bg-surface rounded-card border border-appBorder p-5 shadow-card space-y-3">
              <h4 className="text-xs font-bold text-appText flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                <span>Kinerja SLA Respon</span>
              </h4>

              <div className="p-3 bg-slate-50 border border-appBorder rounded-control space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-appText-muted">Response Due:</span>
                  <span className="font-mono font-semibold text-appText">
                    {formatWIB(ticket.responseDueAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-appText-muted">Respon Pertama:</span>
                  <span className="font-mono text-appText">
                    {formatWIB(ticket.firstResponseAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-appText-muted">Waktu Mulai:</span>
                  <span className="font-mono text-appText">
                    {formatWIB(ticket.startedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-appText-muted">Waktu Selesai:</span>
                  <span className="font-mono text-appText">
                    {formatWIB(ticket.doneAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Consumables Used Card */}
            <div className="bg-surface rounded-card border border-appBorder p-5 shadow-card space-y-3">
              <h4 className="text-xs font-bold text-appText flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-accent" />
                <span>Material Terpakai pada Tiket Ini</span>
              </h4>

              {ticket.consumables.length === 0 ? (
                <p className="text-xs text-appText-muted">Belum ada material yang dicatat.</p>
              ) : (
                <div className="divide-y divide-appBorder text-xs">
                  {ticket.consumables.map((c) => (
                    <div key={c.id} className="py-2 flex items-center justify-between">
                      <span className="font-semibold text-appText">{c.item.name}</span>
                      <span className="font-mono font-bold text-primary">
                        {c.quantityUsed} {c.item.unitOfMeasure}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Engineer Card */}
            <div className="bg-surface rounded-card border border-appBorder p-5 shadow-card space-y-3">
              <h4 className="text-xs font-bold text-appText flex items-center gap-1.5">
                <User className="w-4 h-4 text-accent" />
                <span>Teknisi Penanggung Jawab (PIC)</span>
              </h4>

              {ticket.assignedEngineer ? (
                <div className="p-3 bg-slate-50 border border-appBorder rounded-control space-y-1 text-xs">
                  <p className="font-bold text-appText">{ticket.assignedEngineer.name}</p>
                  <p className="text-[11px] text-appText-muted">{ticket.assignedEngineer.email}</p>
                  <p className="text-[11px] text-appText-muted">
                    Kode: {ticket.assignedEngineer.employeeCode || "ENG"}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-control text-xs text-amber-900">
                  Belum ada teknisi yang ditugaskan pada tiket ini.
                </div>
              )}

              {/* Reassign Form for SPV */}
              {isSPV && (
                <form action={reassignTicket} className="pt-2 space-y-2">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <label className="block text-[11px] font-semibold text-appText">
                    Alihkan Penugasan (Reassign):
                  </label>
                  <select
                    name="engineerId"
                    required
                    defaultValue={ticket.assignedEngineerId || ""}
                    className="w-full px-2.5 py-1.5 text-xs border border-appBorder rounded-control bg-white"
                  >
                    <option value="">-- Pilih Teknisi Lain --</option>
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="reason"
                    placeholder="Alasan pengalihan..."
                    className="w-full px-2.5 py-1.5 text-xs border border-appBorder rounded-control bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-primary text-white text-xs font-semibold rounded-control hover:bg-primary-hover shadow-sm"
                  >
                    Alihkan Teknisi
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
