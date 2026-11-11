import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createLocation,
  createTenant,
  createUnit,
  createEngineerAccount,
} from "./actions";
import {
  MapPin,
  Building,
  Users,
  Plus,
  DoorOpen,
  QrCode,
  Phone,
  Mail,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || "locations";

  const [locations, tenants, units, engineers] = await Promise.all([
    db.location.findMany({ orderBy: { floor: "asc" } }),
    db.tenant.findMany({ orderBy: { tenantName: "asc" } }),
    db.unit.findMany({ include: { tenant: true }, orderBy: { unitCode: "asc" } }),
    db.user.findMany({
      where: {
        roles: {
          some: {
            role: { code: "engineer" },
          },
        },
      },
      include: { engineerProfile: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canManage = user.roleCodes.includes("spv") || user.roleCodes.includes("manager");

  return (
    <div className="p-4 space-y-4">
      {/* Mobile Page Header */}
      <div>
        <h1 className="text-base font-bold text-appText">Master Data Gedung</h1>
        <p className="text-[11px] text-appText-muted">
          Konfigurasi area, tenant, unit kantor, dan akun teknisi
        </p>
      </div>

      {/* Mobile Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <a
          href="?tab=locations"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === "locations"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-appText-muted border border-appBorder hover:bg-slate-50"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Area & Lokasi ({locations.length})</span>
        </a>

        <a
          href="?tab=tenants"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === "tenants"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-appText-muted border border-appBorder hover:bg-slate-50"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Tenant ({tenants.length})</span>
        </a>

        <a
          href="?tab=units"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === "units"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-appText-muted border border-appBorder hover:bg-slate-50"
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          <span>Unit Kantor ({units.length})</span>
        </a>

        <a
          href="?tab=engineers"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === "engineers"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-appText-muted border border-appBorder hover:bg-slate-50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Teknisi ({engineers.length})</span>
        </a>
      </div>

      {/* ============================================================== */}
      {/* 1. LOCATIONS & AREAS TAB                                       */}
      {/* ============================================================== */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          {/* Add Location Form */}
          {canManage && (
            <details className="group bg-surface rounded-card border border-appBorder shadow-card overflow-hidden">
              <summary className="p-3.5 font-bold text-xs text-primary flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Tambah Area / Lokasi Baru</span>
                </span>
                <ChevronDown className="w-4 h-4 text-appText-muted group-open:rotate-180 transition-transform" />
              </summary>
              <form action={createLocation} className="p-4 pt-1 border-t border-appBorder bg-slate-50/50 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Nama Area</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Contoh: CEO Area Lantai 1"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Lantai</label>
                    <input
                      type="text"
                      name="floor"
                      required
                      placeholder="Lantai 1"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Tipe Area</label>
                    <select
                      name="areaType"
                      defaultValue="ceo_area"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    >
                      <option value="ceo_area">CEO Area (Wajib Clock In)</option>
                      <option value="lobby">Lobby Utama</option>
                      <option value="corridor">Fasilitas Umum</option>
                      <option value="mechanical_room">Ruang Mesin ME</option>
                      <option value="parking">Basement / Parkir</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
                >
                  Simpan Lokasi Baru
                </button>
              </form>
            </details>
          )}

          {/* Location Cards */}
          {locations.length === 0 ? (
            <EmptyState
              compact
              title="Belum Ada Lokasi Tercatat"
              description="Tambahkan area gedung seperti 'CEO Area Lantai 1' untuk titik validasi absensi QR teknisi."
              icon={MapPin}
            />
          ) : (
            <div className="space-y-2.5">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3.5 bg-surface border border-appBorder rounded-card shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-appText">{loc.name}</span>
                      <StatusBadge status={loc.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-appText-muted">
                      <span>Lantai {loc.floor}</span>
                      <span>&bull;</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          loc.areaType === "ceo_area"
                            ? "bg-accent/20 text-primary font-bold border border-accent/40"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {loc.areaType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TENANTS TAB                                                 */}
      {/* ============================================================== */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          {/* Add Tenant Form */}
          {canManage && (
            <details className="group bg-surface rounded-card border border-appBorder shadow-card overflow-hidden">
              <summary className="p-3.5 font-bold text-xs text-primary flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Daftarkan Tenant Baru</span>
                </span>
                <ChevronDown className="w-4 h-4 text-appText-muted group-open:rotate-180 transition-transform" />
              </summary>
              <form action={createTenant} className="p-4 pt-1 border-t border-appBorder bg-slate-50/50 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Nama Perusahaan / Penyewa</label>
                  <input
                    type="text"
                    name="tenantName"
                    required
                    placeholder="PT Contoh Sejahtera"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Nama PIC Tenant</label>
                  <input
                    type="text"
                    name="contactName"
                    required
                    placeholder="Bpk / Ibu PIC"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">No. WhatsApp</label>
                    <input
                      type="text"
                      name="contactPhone"
                      required
                      placeholder="0812-xxxx-xxxx"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Email PIC</label>
                    <input
                      type="email"
                      name="contactEmail"
                      required
                      placeholder="pic@tenant.com"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
                >
                  Daftarkan Tenant
                </button>
              </form>
            </details>
          )}

          {/* Tenant Cards */}
          {tenants.length === 0 ? (
            <EmptyState
              compact
              title="Belum Ada Tenant"
              description="Daftarkan entitas penyewa/perusahaan gedung The CEO."
              icon={Building}
            />
          ) : (
            <div className="space-y-2.5">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-surface border border-appBorder rounded-card shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-appText flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-accent" />
                      <span>{t.tenantName}</span>
                    </h3>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  <div className="text-[11px] text-appText-muted space-y-1 pt-1 border-t border-appBorder">
                    <p className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>PIC: <strong className="text-appText">{t.contactName}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.contactPhone}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.contactEmail}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. UNITS TAB                                                   */}
      {/* ============================================================== */}
      {activeTab === "units" && (
        <div className="space-y-4">
          {/* Add Unit Form */}
          {canManage && (
            <details className="group bg-surface rounded-card border border-appBorder shadow-card overflow-hidden">
              <summary className="p-3.5 font-bold text-xs text-primary flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Tambah Unit Kantor Baru</span>
                </span>
                <ChevronDown className="w-4 h-4 text-appText-muted group-open:rotate-180 transition-transform" />
              </summary>
              <form action={createUnit} className="p-4 pt-1 border-t border-appBorder bg-slate-50/50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Kode Unit</label>
                    <input
                      type="text"
                      name="unitCode"
                      required
                      placeholder="Unit 03A"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Lantai</label>
                    <input
                      type="text"
                      name="floor"
                      required
                      placeholder="Lantai 3"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Penyewa (Tenant)</label>
                  <select
                    name="tenantId"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  >
                    <option value="">-- Pilih Tenant (Opsional) --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tenantName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
                >
                  Buat Unit & Generate QR Token
                </button>
              </form>
            </details>
          )}

          {/* Unit Cards */}
          {units.length === 0 ? (
            <EmptyState
              compact
              title="Belum Ada Unit Kantor"
              description="Tambahkan nomor unit kantor (misal: Unit 03A, Lantai 3)."
              icon={DoorOpen}
            />
          ) : (
            <div className="space-y-2.5">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 bg-surface border border-appBorder rounded-card shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {u.unitCode}
                    </span>
                    <span className="text-[11px] text-appText-muted">{u.floor}</span>
                  </div>

                  <div className="text-[11px] text-appText-muted space-y-1">
                    <p>
                      Penyewa: <strong className="text-appText">{u.tenant?.tenantName || "Kosong (Vacant)"}</strong>
                    </p>
                    <p className="flex items-center gap-1 font-mono text-[10px] text-slate-500 truncate">
                      <QrCode className="w-3 h-3 text-accent flex-shrink-0" />
                      <span>Hash: {u.qrTokenHash.slice(0, 16)}...</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ENGINEERS TAB                                               */}
      {/* ============================================================== */}
      {activeTab === "engineers" && (
        <div className="space-y-4">
          {/* Add Engineer Form */}
          {canManage && (
            <details className="group bg-surface rounded-card border border-appBorder shadow-card overflow-hidden">
              <summary className="p-3.5 font-bold text-xs text-primary flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Daftarkan Akun Teknisi Baru</span>
                </span>
                <ChevronDown className="w-4 h-4 text-appText-muted group-open:rotate-180 transition-transform" />
              </summary>
              <form action={createEngineerAccount} className="p-4 pt-1 border-t border-appBorder bg-slate-50/50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Kode Karyawan</label>
                    <input
                      type="text"
                      name="employeeCode"
                      required
                      placeholder="ENG-02"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-appText mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Nama Teknisi"
                      className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Email Login</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="teknisi@theceo.id"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-appText mb-1">Kata Sandi Awal</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
                >
                  Simpan Akun Teknisi
                </button>
              </form>
            </details>
          )}

          {/* Engineer Cards */}
          {engineers.length === 0 ? (
            <EmptyState
              compact
              title="Belum Ada Teknisi Terdaftar"
              description="Daftarkan akun teknisi agar SPV dapat menjadwalkan roster shift dan menugaskan tiket pekerjaan."
              icon={Users}
            />
          ) : (
            <div className="space-y-2.5">
              {engineers.map((eng) => (
                <div
                  key={eng.id}
                  className="p-3.5 bg-surface border border-appBorder rounded-card shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-appText">{eng.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-bold">
                        {eng.employeeCode || "ENG"}
                      </span>
                    </div>
                    <p className="text-[11px] text-appText-muted">{eng.email}</p>
                  </div>

                  <StatusBadge status={eng.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
