import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { getJakartaTime } from "@/lib/date";
import { assignShiftRoster } from "./actions";
import { CalendarDays, Clock, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const todayWIB = getJakartaTime().dateStr;
  const selectedDate = resolvedParams.date || todayWIB;

  const [shifts, engineers, rostersForDate, upcomingRosters] = await Promise.all([
    db.shiftDefinition.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: { role: { code: "engineer" } },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.shiftRoster.findMany({
      where: { shiftDate: selectedDate },
      include: {
        shiftDefinition: true,
        engineer: {
          include: {
            attendances: {
              where: { clockOutAt: null },
              take: 1,
            },
          },
        },
      },
    }),
    db.shiftRoster.findMany({
      take: 15,
      orderBy: [{ shiftDate: "desc" }, { shiftDefinition: { startTime: "asc" } }],
      include: {
        shiftDefinition: true,
        engineer: true,
      },
    }),
  ]);

  const canManage = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-appText">Shift & Roster Teknisi</h2>
        <p className="text-[11px] text-appText-muted">Penugasan standby 3 shift harian</p>
      </div>

      {/* Date Picker Mobile Card */}
      <div className="p-3.5 bg-surface rounded-card border border-appBorder shadow-card space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-appText">
          <CalendarDays className="w-4 h-4 text-accent" />
          <span>Pilih Tanggal Roster (WIB):</span>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="flex-1 min-h-[40px] px-3 py-1.5 text-xs border border-appBorder rounded-control bg-white font-medium text-appText"
          />
          <button
            type="submit"
            className="min-h-[40px] px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm active:scale-95 transition-transform"
          >
            Tampilkan
          </button>
        </form>
      </div>

      {/* 3 Shifts Slot Mobile Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-appText">Slot Shift Tanggal {selectedDate}</h3>

        {shifts.map((shift) => {
          const assigned = rostersForDate.find((r) => r.shiftDefinitionId === shift.id);
          const isClockedIn = assigned?.engineer?.attendances?.length ? true : false;

          return (
            <div
              key={shift.id}
              className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-appText">{shift.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-appText-muted flex items-center gap-1">
                  <Clock className="w-3 h-3 text-accent" />
                  <span>{shift.startTime} - {shift.endTime} WIB</span>
                </span>
              </div>

              {shift.crossesMidnight && (
                <span className="inline-block text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                  Melintasi tengah malam
                </span>
              )}

              {assigned ? (
                <div className="p-2.5 bg-slate-50 border border-appBorder rounded-control flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-appText text-xs">{assigned.engineer.name}</p>
                    <p className="text-[10px] text-appText-muted">{assigned.engineer.email}</p>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      isClockedIn
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {isClockedIn ? "Clocked In" : "Belum Clock In"}
                  </span>
                </div>
              ) : (
                <div className="p-3 text-center border border-dashed border-appBorder rounded-control bg-slate-50/50">
                  <AlertCircle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-appText">Belum Ada Teknisi Standby</p>
                  <p className="text-[10px] text-appText-muted">Auto-assignment akan eskalasi ke SPV jika slot kosong.</p>
                </div>
              )}

              {canManage && (
                <form action={assignShiftRoster} className="pt-2 border-t border-appBorder space-y-1.5">
                  <input type="hidden" name="shiftDefinitionId" value={shift.id} />
                  <input type="hidden" name="shiftDate" value={selectedDate} />

                  <label className="block text-[10px] font-semibold text-appText">
                    {assigned ? "Ganti Teknisi:" : "Tugaskan Teknisi:"}
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      name="engineerUserId"
                      defaultValue={assigned?.engineerUserId || ""}
                      required
                      className="flex-1 min-h-[38px] px-2 py-1 text-xs border border-appBorder rounded-control bg-white"
                    >
                      <option value="">-- Pilih Teknisi --</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name} ({eng.employeeCode || "ENG"})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="min-h-[38px] px-3 py-1 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm active:scale-95 transition-transform"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Roster Cards List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-appText">Riwayat Roster Terjadwal</h3>
        {upcomingRosters.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Roster Terjadwal"
            description="Tugaskan teknisi pada shift di atas untuk mengisi jadwal."
            icon={CalendarDays}
          />
        ) : (
          upcomingRosters.map((r) => (
            <div
              key={r.id}
              className="p-3 bg-surface rounded-card border border-appBorder shadow-card flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-primary block text-xs">{r.engineer.name}</span>
                <span className="text-[10px] text-appText-muted">{r.shiftDefinition.name} ({r.shiftDefinition.startTime} - {r.shiftDefinition.endTime} WIB)</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-appText">
                {r.shiftDate}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
