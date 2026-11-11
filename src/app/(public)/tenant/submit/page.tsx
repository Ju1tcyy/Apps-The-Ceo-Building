import { db } from "@/lib/db";
import { createPublicTenantTicket } from "@/app/(admin)/engineering/tickets/actions";
import { Building2, Send, Wrench, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PublicTenantSubmitPage() {
  const units = await db.unit.findMany({
    where: { isActive: true },
    include: { tenant: true },
    orderBy: { unitCode: "asc" },
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-surface border border-appBorder rounded-card shadow-card overflow-hidden">
        {/* Navy Header */}
        <div className="bg-primary p-6 text-white text-center border-b border-primary-hover">
          <div className="w-12 h-12 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-3">
            <Building2 className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-base font-bold tracking-wider uppercase">
            THE CEO BUILDING
          </h1>
          <p className="text-[11px] tracking-widest text-accent font-medium uppercase mt-0.5">
            Formulir Layanan & Keluhan Tenant
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-control text-xs text-blue-900 flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Silakan laporkan kendala teknis (AC, listrik, plumbing, dsb). Sistem akan secara otomatis menugaskan teknisi standby shift aktif di gedung The CEO.
            </p>
          </div>

          <form action={createPublicTenantTicket} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Nama Pelapor
                </label>
                <input
                  type="text"
                  name="requesterName"
                  required
                  placeholder="Nama Lengkap"
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  name="requesterContact"
                  required
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Unit Kantor (Opsional)
                </label>
                <select
                  name="unitId"
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="">-- Pilih Unit Kantor --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitCode} ({u.floor}) {u.tenant ? `- ${u.tenant.tenantName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Kategori Gangguan
                </label>
                <select
                  name="category"
                  required
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="AC & Sirkulasi Udara">AC & Sirkulasi Udara</option>
                  <option value="Kelistrikan & Lampu">Kelistrikan & Lampu</option>
                  <option value="Plumbing & Air">Plumbing & Sanitasi Air</option>
                  <option value="Sipil & Pintu/Kaca">Sipil, Pintu & Kaca</option>
                  <option value="Fasilitas Umum">Fasilitas Gedung Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-appText mb-1.5">
                Rincian Keluhan
              </label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Jelaskan kendala, lokasi tepatnya, dan kondisi yang terjadi..."
                className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-primary text-white rounded-control text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-4 h-4 text-accent" />
              <span>Kirim Laporan Gangguan</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-appBorder flex items-center justify-between text-xs">
            <Link
              href="/tenant/track"
              className="text-primary hover:text-accent font-semibold transition-colors"
            >
              Lacak Status Tiket Anda →
            </Link>
            <Link
              href="/login"
              className="text-appText-muted hover:text-appText transition-colors"
            >
              Portal Karyawan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
