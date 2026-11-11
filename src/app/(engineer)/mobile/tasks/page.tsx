import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleTaskComplete } from "./actions";
import { ListTodo, CheckCircle2, Circle, MapPin, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MobileTasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tasks = await db.dailyTask.findMany({
    where: { assignedEngineerId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { location: true },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-appText">Daftar Tugas Harian</h2>
        <span className="text-xs font-mono font-bold text-primary">{tasks.length} Tugas</span>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Belum Ada Tugas Harian"
          description="Tugas rutin dari SPV akan tertera di sini."
          icon={ListTodo}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === "COMPLETED";

            return (
              <div
                key={task.id}
                className={`p-4 rounded-card border transition-all ${
                  isDone
                    ? "bg-slate-50/80 border-appBorder opacity-70"
                    : "bg-surface border-appBorder shadow-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <form action={toggleTaskComplete} className="mt-0.5">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="isCompleted" value={isDone ? "false" : "true"} />
                    <button type="submit" className="text-primary hover:opacity-80">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-appText-muted" />
                      )}
                    </button>
                  </form>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={task.priority} size="sm" />
                      <h3
                        className={`text-xs font-bold ${
                          isDone ? "line-through text-appText-muted" : "text-appText"
                        }`}
                      >
                        {task.title}
                      </h3>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-appText-muted mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-appText-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-accent" />
                        <span>{task.location.name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
