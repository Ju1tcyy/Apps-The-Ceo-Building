import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { createInventoryItem, receiveStock } from "./actions";
import {
  Boxes,
  AlertTriangle,
  Plus,
  History,
  ClipboardList,
  CheckCircle2,
  PackagePlus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await db.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const lowStockItems = items.filter((i) => i.quantityOnHand <= i.minimumQuantity);
  const totalStockUnits = items.reduce((acc, curr) => acc + curr.quantityOnHand, 0);

  const canManage = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Page Title & Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Inventaris Consumable</h2>
          <p className="text-[11px] text-appText-muted">{items.length} master barang terdaftar</p>
        </div>
      </div>

      {/* 4 Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          title="Master Item"
          value={items.length > 0 ? items.length : "—"}
          subtitle="Barang consumable"
          icon={Boxes}
        />
        <MetricCard
          title="Total Fisik"
          value={items.length > 0 ? `${totalStockUnits} Unit` : "—"}
          subtitle="Akumulasi stok"
          icon={Boxes}
        />
        <MetricCard
          title="Stok Menipis"
          value={lowStockItems.length}
          subtitle={lowStockItems.length > 0 ? "Perlu restock" : "Semua aman"}
          icon={AlertTriangle}
          highlight={lowStockItems.length > 0}
        />
        <MetricCard
          title="Stok Aman"
          value={items.length - lowStockItems.length}
          subtitle="Di atas batas"
          icon={CheckCircle2}
        />
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-control text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Peringatan: {lowStockItems.length} item di bawah batas minimum</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStockItems.map((item) => (
              <span
                key={item.id}
                className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[10px] text-amber-900 font-semibold"
              >
                {item.name}: {item.quantityOnHand} {item.unitOfMeasure}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/inventory/movements"
          className="p-2.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-appText hover:border-primary flex items-center justify-between shadow-card active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <span>Riwayat Mutasi</span>
          </div>
          <ArrowRight className="w-3 h-3 text-appText-muted" />
        </Link>
        <Link
          href="/inventory/stocktake"
          className="p-2.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-appText hover:border-primary flex items-center justify-between shadow-card active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-accent" />
            <span>Stock Opname</span>
          </div>
          <ArrowRight className="w-3 h-3 text-appText-muted" />
        </Link>
      </div>

      {/* Items List as Mobile Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-appText">Daftar Barang Consumable</h3>

        {items.length === 0 ? (
          <EmptyState
            compact
            title="Belum Ada Item Inventaris"
            description="Database dimulai dalam kondisi bersih. Daftarkan master barang seperti Lampu LED, Pipa PVC, MCB, atau Filter AC."
            icon={Boxes}
          />
        ) : (
          items.map((it) => {
            const isLow = it.quantityOnHand <= it.minimumQuantity;
            const healthRatio =
              it.minimumQuantity > 0
                ? Math.min(100, Math.round((it.quantityOnHand / (it.minimumQuantity * 2)) * 100))
                : 100;

            return (
              <div
                key={it.id}
                className={`bg-surface rounded-card border p-3.5 shadow-card space-y-2.5 transition-colors ${
                  isLow ? "border-amber-300 bg-amber-50/20" : "border-appBorder"
                }`}
              >
                {/* Header: Name + Code + Category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-primary font-bold bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                      {it.itemCode}
                    </span>
                    <span className="text-xs font-bold text-appText">{it.name}</span>
                    <p className="text-[10px] text-appText-muted mt-0.5">{it.category} • {it.storageLocation || "Gudang ME"}</p>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isLow
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {isLow ? "Low Stock" : "Aman"}
                  </span>
                </div>

                {/* Metric: Stock Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-appText-muted">
                      Tersedia: <strong className={isLow ? "text-rose-700" : "text-primary"}>{it.quantityOnHand} {it.unitOfMeasure}</strong>
                    </span>
                    <span className="text-[10px] text-appText-muted">
                      Batas Min: {it.minimumQuantity} {it.unitOfMeasure}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLow ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${healthRatio}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stock-In Form */}
                {canManage && (
                  <div className="pt-2 border-t border-appBorder flex items-center justify-between">
                    <span className="text-[10px] font-medium text-appText-muted">
                      Terima Stok Masuk:
                    </span>
                    <form action={receiveStock} className="flex items-center gap-1.5">
                      <input type="hidden" name="itemId" value={it.id} />
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        defaultValue="1"
                        className="w-14 min-h-[32px] px-1.5 py-0.5 text-xs border border-appBorder rounded bg-white text-center font-bold"
                      />
                      <button
                        type="submit"
                        className="min-h-[32px] px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-control hover:bg-primary-hover active:scale-95 transition-transform"
                      >
                        + Masuk
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Item Form (Collapsible/Mobile Friendly) */}
      {canManage && (
        <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-appText">Tambah Master Barang Baru</h3>
          </div>

          <form action={createInventoryItem} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Kode Barang (Item Code) *
              </label>
              <input
                type="text"
                name="itemCode"
                required
                placeholder="Contoh: ELK-001"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-appText mb-1">
                Nama Barang *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Lampu LED Tube 18W"
                className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Kategori *
                </label>
                <select
                  name="category"
                  required
                  className="w-full min-h-[44px] px-2 py-2 border border-appBorder rounded-control bg-white"
                >
                  <option value="Listrik">Listrik</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="AC / HVAC">AC / HVAC</option>
                  <option value="Sipil & Cat">Sipil & Cat</option>
                  <option value="Fasilitas Umum">Fasilitas Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Satuan Ukur *
                </label>
                <input
                  type="text"
                  name="unitOfMeasure"
                  required
                  placeholder="Pcs / Roll / Btg"
                  defaultValue="Pcs"
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
                >
                </input>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Stok Awal
                </label>
                <input
                  type="number"
                  name="initialQuantity"
                  min="0"
                  defaultValue="0"
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-appText mb-1">
                  Batas Min *
                </label>
                <input
                  type="number"
                  name="minimumQuantity"
                  min="0"
                  defaultValue="5"
                  required
                  className="w-full min-h-[44px] px-3 py-2 border border-appBorder rounded-control bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] mt-2 py-2.5 px-4 bg-primary text-white font-bold text-xs rounded-control hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-accent" />
              <span>Daftarkan Barang Baru</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
