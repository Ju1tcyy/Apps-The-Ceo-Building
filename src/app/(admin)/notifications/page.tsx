import { getCurrentUser } from "@/lib/auth";
import { getOperationalNotifications } from "@/lib/notifications";
import { formatWIB } from "@/lib/date";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Bell,
  AlertTriangle,
  Package,
  Wrench,
  Receipt,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await getOperationalNotifications();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "sla_overdue":
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case "unassigned_ticket":
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case "low_stock":
        return <Package className="w-4 h-4 text-orange-600" />;
      case "pending_approval":
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      case "invoice_overdue":
        return <Receipt className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "sla_overdue":
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">SLA OVERDUE</span>;
      case "unassigned_ticket":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">TIKET TERBUKA</span>;
      case "low_stock":
        return <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">STOK KRITIS</span>;
      case "pending_approval":
        return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">APPROVAL AI</span>;
      case "invoice_overdue":
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">TAGIHAN OVERDUE</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Mobile Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-appBorder">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-appText-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-appText">Pusat Notifikasi</h1>
            <p className="text-[11px] text-appText-muted">
              Peringatan operasional gedung The CEO secara real-time
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
          {notifications.length} Aktif
        </span>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title="Tidak Ada Notifikasi Aktif"
            description="Semua sistem operasional, SLA respon tiket, stok gudang, dan tagihan tenant berjalan dalam kondisi normal."
            icon={CheckCircle2}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`block p-3.5 bg-surface border rounded-card shadow-sm hover:border-primary transition-all active:scale-[0.99] ${
                item.severity === "urgent"
                  ? "border-l-4 border-l-rose-500 border-appBorder"
                  : "border-l-4 border-l-amber-500 border-appBorder"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-appBorder flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    {getCategoryBadge(item.category)}
                    <span className="text-[10px] text-appText-muted">
                      {formatWIB(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-appText truncate">
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-appText-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-appText-muted flex-shrink-0 self-center" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
