import { db } from "@/lib/db";
import { formatWIB } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building2, Search, ArrowLeft, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function PublicTenantTrackPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const resolvedParams = await searchParams;
  const ticketQuery = resolvedParams.ticket?.trim() || "";

  let ticket = null;
  if (ticketQuery) {
    ticket = await db.ticket.findUnique({
      where: { ticketNumber: ticketQuery },
      include: {
        unit: true,
        location: true,
      },
    });
  }

  const steps = [
    { key: "OPEN", label: "Diterima" },
    { key: "ASSIGNED", label: "Ditugaskan" },
    { key: "IN_PROGRESS", label: "Dikerjakan" },
    { key: "DONE", label: "Selesai" },
    { key: "VERIFIED", label: "Terverifikasi" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "OPEN": return 0;
      case "ASSIGNED": return 1;
      case "IN_PROGRESS": return 2;
      case "DONE": return 3;
      case "VERIFIED": return 4;
      default: return 0;
    }
  };

  const currentIndex = ticket ? getStepIndex(ticket.status) : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-surface border border-appBorder rounded-card shadow-card overflow-hidden">
        {/* Navy Header */}
        <div className="bg-primary p-6 text-white text-center border-b border-primary-hover">
          <div className="w-12 h-12 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-3">
            <Building2 className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-base font-bold tracking-wider uppercase">
            THE CEO BUILDING
          </h1>
          <p className="text-[11px] tracking-widest text-accent font-medium uppercase mt-0.5">
            Pelacakan Status Keluhan Tenant
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <form method="GET" className="flex gap-2 mb-6">
            <input
              type="text"
              name="ticket"
              defaultValue={ticketQuery}
              required
              placeholder="Masukkan Nomor Tiket (Contoh: TC-20261108-0001)"
              className="flex-1 px-3.5 py-2 text-xs border border-appBorder rounded-control bg-white font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-control hover:bg-primary-hover flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </form>

          {ticketQuery && !ticket && (
            <div className="p-4 text-center bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-800 mb-4">
              Nomor tiket <strong>{ticketQuery}</strong> tidak ditemukan. Harap periksa kembali nomor tiket yang Anda masukkan.
            </div>
          )}

          {ticket && (
            <div className="space-y-6">
              {/* Ticket Summary Card */}
              <div className="p-4 bg-slate-50 border border-appBorder rounded-control space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-primary">{ticket.ticketNumber}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <h3 className="text-sm font-bold text-appText">{ticket.category}</h3>
                <p className="text-xs text-appText-muted">{ticket.description}</p>
                <div className="pt-2 border-t border-appBorder flex items-center justify-between text-[11px] text-appText-muted">
                  <span>Unit: {ticket.unit?.unitCode || ticket.location.name}</span>
                  <span>Waktu: {formatWIB(ticket.createdAt)}</span>
                </div>
              </div>

              {/* Progress Flow */}
              <div>
                <h4 className="text-xs font-bold text-appText mb-3">Progres Pekerjaan</h4>
                <div className="relative flex justify-between items-center px-2">
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                  {steps.map((step, idx) => {
                    const isPassed = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;

                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCurrent
                              ? "bg-accent text-primary ring-4 ring-accent/20"
                              : isPassed
                              ? "bg-primary text-white"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 font-medium ${
                            isCurrent ? "font-bold text-primary" : "text-appText-muted"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-appBorder flex items-center justify-between text-xs">
            <Link
              href="/tenant/submit"
              className="text-primary hover:text-accent font-semibold transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buat Laporan Baru</span>
            </Link>
            <Link
              href="/login"
              className="text-appText-muted hover:text-appText transition-colors"
            >
              Login Karyawan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
