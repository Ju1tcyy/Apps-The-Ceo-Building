import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import { Wrench, MapPin, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MobileTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tickets = await db.ticket.findMany({
    where: {
      assignedEngineerId: user.id,
    },
    orderBy: { createdAt: "desc" },
    include: { location: true, unit: true },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-appText">Tiket Pekerjaan Saya</h2>
        <span className="text-xs font-mono font-bold text-primary">{tickets.length} Tiket</span>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="Belum Ada Tiket Ditugaskan"
          description="Tiket baru yang di-assign oleh sistem atau SPV akan muncul di sini."
          icon={Wrench}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/engineering/tickets/${t.id}`}
              className="block p-4 bg-surface rounded-card border border-appBorder shadow-card hover:border-primary transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-primary">{t.ticketNumber}</span>
                <StatusBadge status={t.status} size="sm" />
              </div>
              <h3 className="text-xs font-bold text-appText">{t.category}</h3>
              <p className="text-[11px] text-appText-muted line-clamp-2">{t.description}</p>
              <div className="pt-2 border-t border-appBorder flex items-center justify-between text-[10px] text-appText-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  <span>{t.unit ? t.unit.unitCode : t.location.name}</span>
                </span>
                <span>{formatWIB(t.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
