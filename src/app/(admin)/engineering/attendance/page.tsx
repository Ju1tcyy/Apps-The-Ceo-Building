import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatWIB } from "@/lib/date";
import { UserCheck, MapPin, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AttendanceMonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const records = await db.attendanceRecord.findMany({
    orderBy: { clockInAt: "desc" },
    take: 50,
    include: {
      engineer: true,
      clockInLocation: true,
      clockOutLocation: true,
      shiftRoster: {
        include: { shiftDefinition: true },
      },
    },
  });

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-appText">Monitoring Kehadiran Teknisi</h2>
        <p className="text-[11px] text-appText-muted">Verifikasi absensi live camera & QR lokasi CEO Area</p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="Belum Ada Catatan Kehadiran"
          description="Absensi teknisi yang melakukan Clock In di Area CEO akan tampil di sini."
          icon={UserCheck}
        />
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2"
            >
              {/* Header: Name + Verification Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-appText text-xs">{r.engineer.name}</span>
                <StatusBadge status={r.verificationStatus} size="sm" />
              </div>

              {/* Shift & Location */}
              <div className="bg-slate-50 p-2.5 rounded-control border border-appBorder text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-appText-muted">Shift:</span>
                  <span className="font-semibold text-primary">
                    {r.shiftRoster?.shiftDefinition.name || "Standby Tambahan"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-appText-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>Lokasi:</span>
                  </span>
                  <span className="font-medium text-appText">{r.clockInLocation.name}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-appBorder">
                  <span className="text-appText-muted">Clock In:</span>
                  <span className="font-mono text-appText font-medium">{formatWIB(r.clockInAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-appText-muted">Clock Out:</span>
                  <span className="font-mono text-appText font-medium">
                    {r.clockOutAt ? formatWIB(r.clockOutAt) : "— Bertugas —"}
                  </span>
                </div>
              </div>

              {/* PDP Info */}
              <div className="text-[10px] text-appText-muted flex items-center justify-between pt-1">
                <span>Foto Selfie: Retensi 30 Hari (UU PDP)</span>
                <span className="font-mono text-emerald-700 font-semibold">Tervalidasi QR</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
