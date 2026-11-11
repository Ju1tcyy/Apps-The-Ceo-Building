import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import { ShieldCheck, User, Calendar, Activity, Info } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user.roleCodes, "audit.view")) {
    return (
      <div className="p-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-800">
          Anda tidak memiliki izin (audit.view) untuk melihat catatan audit trail.
        </div>
      </div>
    );
  }

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: true,
    },
  });

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-appText">Audit Trail & Keamanan</h2>
        <p className="text-[11px] text-appText-muted">Catatan keabsahan audit append-only permanen</p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-control text-[11px] text-blue-900 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
        <span>
          Semua aksi perubahan tiket, stok, pembayaran, approval AI, dan login dicatat secara permanen tanpa dapat diubah atau dihapus.
        </span>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          compact
          title="Belum Ada Catatan Audit"
          description="Audit log akan otomatis terisi saat transaksi operasional dilakukan."
          icon={ShieldCheck}
        />
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-surface rounded-card border border-appBorder p-3 shadow-card space-y-2"
            >
              {/* Header: Action + Source */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary text-xs">{log.action}</span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    log.source === "ai"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : log.source === "system"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {log.source || "human"}
                </span>
              </div>

              {/* Context: Actor & Role + Module */}
              <div className="flex items-center justify-between text-[11px] text-appText-muted bg-slate-50 p-2 rounded-control border border-appBorder">
                <div>
                  <span className="font-semibold text-appText">
                    {log.actor?.name || log.actorUserId || "System / Public"}
                  </span>
                  <span className="ml-1 text-[10px] uppercase font-bold text-primary">
                    ({log.actorRole})
                  </span>
                </div>
                <span className="capitalize">{log.module}</span>
              </div>

              {/* Entity & Timestamp */}
              <div className="flex items-center justify-between text-[10px] text-appText-muted pt-1 border-t border-appBorder">
                <span className="font-mono truncate max-w-[180px]">
                  {log.entityType}:{log.entityId.slice(0, 10)}
                </span>
                <span className="font-mono text-slate-400">{formatWIB(log.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
