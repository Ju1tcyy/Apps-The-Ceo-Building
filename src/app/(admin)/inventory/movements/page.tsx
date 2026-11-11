import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWIB } from "@/lib/date";
import { History, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StockMovementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const movements = await db.inventoryTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      item: true,
      creator: true,
    },
  });

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Riwayat Mutasi Stok</h2>
          <p className="text-[11px] text-appText-muted">{movements.length} transaksi audit material</p>
        </div>
        <Link
          href="/inventory"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

      {movements.length === 0 ? (
        <EmptyState
          compact
          title="Belum Ada Riwayat Mutasi"
          description="Penerimaan barang masuk atau pemakaian tiket selesai akan terekam di sini."
          icon={History}
        />
      ) : (
        <div className="space-y-2.5">
          {movements.map((m) => {
            const isPositive = m.quantityDelta > 0;
            return (
              <div
                key={m.id}
                className="bg-surface rounded-card border border-appBorder p-3.5 shadow-card space-y-2"
              >
                {/* Header: Item & Type */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-primary font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      {m.item.itemCode}
                    </span>
                    <span className="font-bold text-appText">{m.item.name}</span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      m.transactionType === "CONSUMPTION"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : m.transactionType === "STOCK_IN"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {m.transactionType}
                  </span>
                </div>

                {/* Metric & Reference */}
                <div className="bg-slate-50 p-2.5 rounded-control border border-appBorder text-[11px] flex items-center justify-between">
                  <div>
                    <span className="text-appText-muted block text-[10px]">Perubahan Kuantitas:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isPositive ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {isPositive ? `+${m.quantityDelta}` : m.quantityDelta} {m.item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-appText-muted block">Referensi / PIC:</span>
                    <span className="font-semibold text-appText">
                      {m.creator?.name || "System"}
                    </span>
                  </div>
                </div>

                {/* Footer Reason & Date */}
                <div className="flex items-center justify-between text-[10px] text-appText-muted pt-1 border-t border-appBorder">
                  <span className="truncate max-w-[200px]">
                    Catatan: {m.reason || "—"}
                  </span>
                  <span className="font-mono text-slate-400">{formatWIB(m.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
