import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatWIB } from "@/lib/date";
import { isResponseOverdue } from "@/lib/sla";
import { Wrench, Plus, User, AlertTriangle, ChevronRight, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EngineeringTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status;

  const whereClause: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    whereClause.status = statusFilter;
  }

  // If user is engineer only, filter by assigned tickets
  if (
    user.roleCodes.includes("engineer") &&
    !user.roleCodes.includes("spv") &&
    !user.roleCodes.includes("manager") &&
    !user.roleCodes.includes("direksi")
  ) {
    whereClause.assignedEngineerId = user.id;
  }

  const tickets = await db.ticket.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      location: true,
      unit: true,
      assignedEngineer: true,
    },
  });

  const canCreate = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Header & New Ticket Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Tiket Pekerjaan</h2>
          <p className="text-[11px] text-appText-muted">
            {tickets.length} tiket ditemukan
          </p>
        </div>

        {canCreate && (
          <Link
            href="/engineering/tickets/new"
            className="min-h-[40px] px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-control hover:bg-primary-hover shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>+ Buat Tiket</span>
          </Link>
        )}
      </div>

      {/* Touch-Friendly Horizontal Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: "Semua", value: "ALL" },
          { label: "Open", value: "OPEN" },
          { label: "Assigned", value: "ASSIGNED" },
          { label: "In Progress", value: "IN_PROGRESS" },
          { label: "Done", value: "DONE" },
          { label: "Verified", value: "VERIFIED" },
        ].map((tab) => {
          const isActive = (!statusFilter && tab.value === "ALL") || statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/engineering" : `/engineering?status=${tab.value}`}
              className={`px-3 py-1.5 text-xs rounded-full font-semibold whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface border border-appBorder text-appText-muted hover:text-appText"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile Ticket Cards List */}
      {tickets.length === 0 ? (
        <EmptyState
          title="Belum Ada Tiket"
          description="Tidak ada tiket pekerjaan yang sesuai dengan kriteria filter saat ini."
          icon={Wrench}
          action={
            canCreate
              ? {
                  label: "+ Buat Tiket Sekarang",
                  href: "/engineering/tickets/new",
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const isOverdue =
              t.status === "OPEN" || t.status === "ASSIGNED"
                ? isResponseOverdue(t.responseDueAt, t.firstResponseAt)
                : false;

            return (
              <Link
                key={t.id}
                href={`/engineering/tickets/${t.id}`}
                className="block bg-surface rounded-card border border-appBorder p-4 shadow-card hover:border-primary/40 active:bg-slate-50 transition-colors"
              >
                {/* Top Row: Ticket Number + Category + Priority */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary">
                      {t.ticketNumber}
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {t.category}
                    </span>
                  </div>
                  <StatusBadge status={t.priority} size="sm" />
                </div>

                {/* Description */}
                <p className="text-xs font-semibold text-appText line-clamp-2 mb-2.5">
                  {t.description}
                </p>

                {/* Location & Requester */}
                <div className="text-[11px] text-appText-muted space-y-1 mb-3 bg-slate-50 p-2.5 rounded-control border border-appBorder">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
                    <span className="truncate">
                      {t.unit ? `Unit ${t.unit.unitCode} (${t.unit.floor})` : t.location.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="truncate">Pelapor: {t.requesterName}</span>
                    <span className="text-[10px] text-slate-400">{formatWIB(t.createdAt)}</span>
                  </div>
                </div>

                {/* Bottom Row: Status + PIC + Link */}
                <div className="flex items-center justify-between pt-2 border-t border-appBorder">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} size="sm" />
                    {isOverdue && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>SLA Overdue</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                    <span className="text-[11px] text-appText-muted mr-1">
                      {t.assignedEngineer ? t.assignedEngineer.name : "Belum di-assign"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
