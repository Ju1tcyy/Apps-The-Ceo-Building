"use client";

import React, { useActionState } from "react";
import { bootstrapSystem } from "./actions";
import { KeyRound } from "lucide-react";

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(bootstrapSystem, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-appText mb-1.5">
          Nama Lengkap
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="Contoh: Budi Santoso"
          className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-appText mb-1.5">
          Alamat Email (Login)
        </label>
        <input
          type="email"
          name="email"
          required
          placeholder="admin@perusahaan.com"
          className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-appText mb-1.5">
          Kata Sandi (Min. 8 karakter)
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="••••••••••••"
          className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-appText mb-1.5">
          Peran Utama (Role)
        </label>
        <select
          name="role"
          defaultValue="spv"
          className="w-full px-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
        >
          <option value="spv">Supervisor Operasional (SPV)</option>
          <option value="manager">Manager Operasional</option>
          <option value="direksi">Direksi / Executive</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-2 py-2.5 px-4 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        <KeyRound className="w-4 h-4 text-accent" />
        <span>{isPending ? "Menginisialisasi..." : "Inisialisasi & Masuk ke Dashboard"}</span>
      </button>
    </form>
  );
}
