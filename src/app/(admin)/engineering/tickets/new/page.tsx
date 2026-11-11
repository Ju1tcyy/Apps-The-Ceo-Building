import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInternalTicket } from "../actions";
import { Wrench, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewInternalTicketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager")) {
    redirect("/engineering");
  }

  const [locations, engineers] = await Promise.all([
    db.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { code: "engineer" } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-appText">Buat Tiket Baru</h2>
          <p className="text-[11px] text-appText-muted">Pencatatan kendala internal/telepon/WA</p>
        </div>
        <Link
          href="/engineering"
          className="min-h-[36px] px-3 py-1.5 bg-surface border border-appBorder rounded-control text-xs font-semibold text-primary hover:border-primary flex items-center gap-1 shadow-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </Link>
      </div>

      <div className="bg-surface rounded-card border border-appBorder shadow-card p-4">
          <form action={createInternalTicket} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Kanal Sumber Pelaporan
                </label>
                <select
                  name="source"
                  defaultValue="internal"
                  className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
                >
                  <option value="internal">Temuan Internal Gedung</option>
                  <option value="phone">Laporan Telepon (Call Center/SPV)</option>
                  <option value="whatsapp">Laporan Pesan WhatsApp Tenant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Tingkat Prioritas (SLA)
                </label>
                <select
                  name="priority"
                  defaultValue="MEDIUM"
                  className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
                >
                  <option value="LOW">Low (Respon 2 Jam)</option>
                  <option value="MEDIUM">Medium (Respon 1 Jam)</option>
                  <option value="HIGH">High (Respon 30 Menit)</option>
                  <option value="EMERGENCY">Emergency (Respon 15 Menit)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Nama Pelapor
                </label>
                <input
                  type="text"
                  name="requesterName"
                  required
                  placeholder="Nama Pelapor / Staff"
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Kontak Pelapor
                </label>
                <input
                  type="text"
                  name="requesterContact"
                  placeholder="No. Telepon / Ext / WA"
                  className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-appText mb-1.5">
                  Lokasi / Area Masalah
                </label>
                <select
                  name="locationId"
                  required
                  className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
                >
                  <option value="">-- Pilih Lokasi Gedung --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.floor})
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
                  className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
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
                Penugasan Teknisi
              </label>
              <select
                name="assignedEngineerId"
                className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
              >
                <option value="">Auto-Assign (Otomatis ke Teknisi Standby Shift Aktif yang Clock In)</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    Manual: {eng.name} ({eng.employeeCode || "ENG"})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-appText-muted mt-1">
                Jika memilih Auto-Assign, sistem akan memvalidasi jadwal roster dan jam clock-in teknisi di Area CEO.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-appText mb-1.5">
                Deskripsi Kendala
              </label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Jelaskan temuan atau kendala teknis yang perlu diperbaiki..."
                className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-white rounded-control text-xs font-bold hover:bg-primary-hover shadow-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-accent" />
                <span>Simpan & Buat Tiket</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
