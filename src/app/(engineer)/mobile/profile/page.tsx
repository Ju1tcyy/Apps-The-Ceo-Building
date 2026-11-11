import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { User, LogOut, ShieldCheck, Mail, Hash, Calendar } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MobileProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const engineerProfile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-base font-bold text-appText">Profil Teknisi</h2>

      <div className="bg-surface rounded-card border border-appBorder p-6 shadow-card text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-primary text-accent font-bold text-xl flex items-center justify-center mx-auto border-2 border-accent/40 shadow-sm">
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="text-sm font-bold text-appText">{user.name}</h3>
          <p className="text-xs text-appText-muted">{user.email}</p>
        </div>
        <div className="flex justify-center gap-1.5 pt-1">
          {user.roleCodes.map((r) => (
            <span
              key={r}
              className="px-2 py-0.5 bg-slate-100 text-primary font-semibold text-[10px] rounded uppercase border border-slate-200"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-card border border-appBorder p-4 shadow-card space-y-3 text-xs">
        <h4 className="font-bold text-appText text-xs uppercase tracking-wider text-appText-muted">
          Informasi Akun & Kepegawaian
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
            <span>Status Keaktifan</span>
          </span>
          <span className="font-bold text-emerald-600">Aktif</span>
        </div>
      </div>

      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="w-full py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-card text-xs font-bold hover:bg-rose-100 shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun (Logout)</span>
        </button>
      </form>
    </div>
  );
}
