import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";
import { Building2, ShieldCheck } from "lucide-react";

export default async function SetupPage() {
  const userCount = await db.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface border border-appBorder rounded-card shadow-card overflow-hidden">
        {/* Navy Header */}
        <div className="bg-primary p-6 text-white text-center border-b border-primary-hover">
          <div className="w-12 h-12 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-3">
            <Building2 className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-base font-bold tracking-wider uppercase">
            THE CEO BUILDING
          </h1>
          <p className="text-[11px] tracking-widest text-accent font-medium uppercase mt-0.5">
            Initial System Setup
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-control text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Inisialisasi Akun Pertama</p>
              <p className="text-amber-800 leading-relaxed">
                Database saat ini kosong sesuai prinsip <em>Zero Dummy Data</em>. Silakan daftarkan akun administrator pertama Anda untuk mulai mengoperasikan sistem.
              </p>
            </div>
          </div>

          <SetupForm />
        </div>
      </div>
    </div>
  );
}
