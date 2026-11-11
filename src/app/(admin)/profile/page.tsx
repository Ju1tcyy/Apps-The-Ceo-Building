import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  User,
  LogOut,
  ShieldCheck,
  Mail,
  Hash,
  Calendar,
  Settings,
  ShieldAlert,
  ChevronRight,
  Boxes,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";

export default async function UniversalProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const engineerProfile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
  });

  const canManageSettings =
    user.roleCodes.includes("direksi") ||
    user.roleCodes.includes("manager") ||
    user.roleCodes.includes("spv");

  return (
    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
      <div>
        <h1 className="text-base font-bold text-appText">Profil Pengguna</h1>
        <p className="text-[11px] text-appText-muted">Manajemen identitas dan keamanan akun</p>
      </div>
        {/* User Card */}
        <div className="bg-surface rounded-card border border-appBorder p-5 shadow-card text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary text-accent font-bold text-xl flex items-center justify-center mx-auto border-2 border-accent/40 shadow-sm">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-appText">{user.name}</h3>
            <p className="text-xs text-appText-muted">{user.email}</p>
          </div>
          <div className="flex justify-center flex-wrap gap-1.5 pt-1">
            {user.roleCodes.map((r) => (
              <span
                key={r}
                className="px-2.5 py-0.5 bg-accent/15 text-primary border border-accent/30 font-bold text-[10px] rounded uppercase"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-2.5 text-xs">
          <h4 className="font-bold text-appText text-xs uppercase tracking-wider text-appText-muted mb-2">
            Informasi Pengguna
          </h4>
          <div className="flex items-center justify-between py-2 border-b border-appBorder">
            <span className="text-appText-muted flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-accent" />
              <span>Kode Karyawan</span>
            </span>
            <span className="font-mono font-bold text-appText">
              {engineerProfile?.employeeCode || user.employeeCode || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-appBorder">
            <span className="text-appText-muted flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-accent" />
              <span>Email</span>
            </span>
            <span className="font-medium text-appText">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-appText-muted flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Status Keamanan</span>
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Session Aktif (JWT)
            </span>
          </div>
        </div>

        {/* Additional Navigation Links for SPV / Manager / Direksi */}
        {canManageSettings && (
          <div className="bg-surface rounded-card border border-appBorder shadow-card divide-y divide-appBorder overflow-hidden">
            <Link
              href="/settings"
              className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-primary" />
                <span className="font-semibold text-appText">Pengaturan Master Data Gedung</span>
              </div>
              <ChevronRight className="w-4 h-4 text-appText-muted" />
            </Link>
            <Link
              href="/audit-log"
              className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <span className="font-semibold text-appText">Audit Trail & Log Keamanan</span>
              </div>
              <ChevronRight className="w-4 h-4 text-appText-muted" />
            </Link>
          </div>
        )}

        {/* Logout Action */}
        <div className="pt-2">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-control font-bold text-xs hover:bg-rose-100 transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun (Logout)</span>
            </button>
          </form>
        </div>
      </div>
  );
}
