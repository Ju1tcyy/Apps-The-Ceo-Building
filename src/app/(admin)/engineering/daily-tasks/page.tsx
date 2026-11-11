import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createDailyTask } from "./actions";
import { ListTodo, Plus, MapPin, User, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminDailyTasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tasks, locations, engineers] = await Promise.all([
    db.dailyTask.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        location: true,
        assignedEngineer: true,
        creator: true,
      },
    }),
    db.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { code: "engineer" } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const canManage = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-appText">Tugas Harian Teknisi</h2>
        <p className="text-[11px] text-appText-muted">{tasks.length} checklist pemeliharaan rutin</p>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Tugas Harian"
            description="Buat checklist tugas rutin seperti 'Inspeksi AC Lobby' atau 'Pengecekan Panel Listrik' melalui form di bawah."
            icon={ListTodo}
          />
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-appText">{task.title}</h4>
                  {task.description && (
                    <p className="text-[11px] text-appText-muted mt-0.5">{task.description}</p>
                  )}
                </div>
                <StatusBadge status={task.status} size="sm" />
              </div>

              <div className="bg-slate-50 p-2 rounded-control border border-appBorder text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-appText-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{task.location.name} ({task.location.floor})</span>
                  </span>
                  <StatusBadge status={task.priority} size="sm" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-appBorder">
                  <span className="text-appText-muted flex items-center gap-1">
                    <User className="w-3 h-3 text-accent" />
                    <span>PIC: {task.assignedEngineer ? task.assignedEngineer.name : "Belum di-assign"}</span>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Form: Buat Tugas Harian */}
      {canManage && (
        <div className="bg-surface rounded-card border border-appBorder shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-appText">Buat Tugas Harian Baru</h3>
          </div>

          <form action={createDailyTask} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Judul Pekerjaan *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Contoh: Check AC Lobby Utama"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Lokasi / Lantai *
              </label>
              <select
                name="locationId"
                required
                className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
              >
                <option value="">Pilih Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.floor})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Teknisi PIC
                </label>
                <select
                  name="assignedEngineerId"
                  className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
                >
                  <option value="">Belum Ditugaskan</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Prioritas
                </label>
                <select
                  name="priority"
                  defaultValue="MEDIUM"
                  className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Instruksi Tambahan
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Catatan inspeksi atau peralatan yang perlu disiapkan..."
                className="w-full px-3 py-2 border border-appBorder rounded-control bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 px-4 bg-primary text-white font-bold text-xs rounded-control hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-accent" />
              <span>Simpan Tugas Harian</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
