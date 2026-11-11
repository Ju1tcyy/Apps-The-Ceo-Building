import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJakartaTime } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Building2,
  Bell,
  Wrench,
  Camera,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EngineerMobileHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { hour } = getJakartaTime();
  let greeting = "Selamat Pagi";
  if (hour >= 11 && hour < 15) greeting = "Selamat Siang";
  else if (hour >= 15 && hour < 19) greeting = "Selamat Sore";
  else if (hour >= 19 || hour < 5) greeting = "Selamat Malam";

  const [assignedTickets, activeAttendance, todayTasks] = await Promise.all([
    db.ticket.findMany({
      where: {
        assignedEngineerId: user.id,
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
      include: { location: true },
      orderBy: { createdAt: "desc" },
    }),
    db.attendanceRecord.findFirst({
      where: {
        engineerUserId: user.id,
        clockOutAt: null,
      },
      include: { clockInLocation: true },
      orderBy: { clockInAt: "desc" },
    }),
    db.dailyTask.findMany({
      where: {
        assignedEngineerId: user.id,
        status: { not: "COMPLETED" },
      },
      include: { location: true },
      take: 3,
    }),
  ]);

  const totalAssignedAllTime = await db.ticket.count({
    where: { assignedEngineerId: user.id },
  });
  const totalCompletedAllTime = await db.ticket.count({
    where: {
      assignedEngineerId: user.id,
      status: { in: ["DONE", "VERIFIED"] },
    },
  });

  const progressPercent =
    totalAssignedAllTime > 0
      ? Math.round((totalCompletedAllTime / totalAssignedAllTime) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Building2 className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wider uppercase text-primary">
              THE CEO BUILDING
            </h1>
            <p className="text-[9px] tracking-widest text-accent font-semibold uppercase">
              Engineer Field Ops
            </p>
          </div>
        </div>
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-surface border border-appBorder flex items-center justify-center text-appText-muted hover:text-primary"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Greeting Card */}
      <div className="flex items-center gap-3 py-1">
        <div className="w-11 h-11 rounded-full bg-primary text-accent font-bold text-sm flex items-center justify-center border-2 border-accent/40 flex-shrink-0">
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-appText-muted">{greeting},</p>
          <h2 className="text-sm font-bold text-appText">{user.name}</h2>
          {activeAttendance ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Clocked In: {activeAttendance.clockInLocation.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Belum Clock In di Area CEO</span>
            </span>
          )}
        </div>
      </div>

      {/* Your Assigned Tickets Card (Navy Hero) */}
      <div className="bg-primary text-white rounded-card p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-control bg-white/10 text-accent flex items-center justify-center">
            <Wrench className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs text-white/80">Tiket Ditugaskan</p>
            <h3 className="text-2xl font-bold text-white">{assignedTickets.length}</h3>
          </div>
        </div>
        <Link
          href="/engineering"
          className="text-xs font-semibold text-accent hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Lihat Semua</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Two Large Action Tiles: Clock In & Scan QR */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/mobile/attendance"
          className={`p-4 rounded-card border transition-all text-center flex flex-col items-center justify-center shadow-sm ${
            activeAttendance
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
              : "bg-surface border-appBorder text-appText hover:border-primary"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              activeAttendance ? "bg-emerald-600 text-white" : "bg-primary text-accent"
            }`}
          >
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold block">
            {activeAttendance ? "Clock Out" : "Clock In (CEO Area)"}
          </span>
          <span className="text-[10px] text-appText-muted mt-0.5">Kamera Live & QR</span>
        </Link>

        <Link
          href="/mobile/attendance"
          className="p-4 rounded-card bg-surface border border-appBorder hover:border-primary transition-all text-center flex flex-col items-center justify-center shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 text-primary flex items-center justify-center mb-2">
            <QrCode className="w-5 h-5 text-accent" />
          </div>
          <span className="text-xs font-bold text-appText block">Scan QR</span>
          <span className="text-[10px] text-appText-muted mt-0.5">Verifikasi Lokasi</span>
        </Link>
      </div>

      {/* Today's Tasks Section */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-appText uppercase tracking-wider">
            Tugas Hari Ini (Today's Tasks)
          </h3>
          <Link href="/mobile/tasks" className="text-[11px] font-semibold text-primary">
            Lihat Semua →
          </Link>
        </div>

        {todayTasks.length === 0 ? (
          <EmptyState
            compact
            title="Tidak Ada Tugas Tertunda"
            description="Semua tugas harian yang diberikan SPV telah selesai dikerjakan."
            icon={ListTodo}
          />
        ) : (
          <div className="space-y-2.5">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-slate-50 border border-appBorder rounded-control flex items-start gap-2.5"
              >
                <div className="w-4 h-4 rounded-full border-2 border-primary/40 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <StatusBadge status={task.priority} size="sm" />
                    <span className="text-xs font-bold text-appText truncate">{task.title}</span>
                  </div>
                  <p className="text-[11px] text-appText-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{task.location.name} ({task.location.floor})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maintenance Progress Card */}
      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-appText">Progres Penyelesaian Tiket</h3>
          <span className="text-xs font-bold text-primary">{progressPercent}%</span>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-appText-muted pt-1">
          <span>{totalCompletedAllTime} dari {totalAssignedAllTime} tiket diselesaikan</span>
          <Link href="/engineering" className="text-primary font-semibold hover:underline">
            Rincian →
          </Link>
        </div>
      </div>
    </div>
  );
}
