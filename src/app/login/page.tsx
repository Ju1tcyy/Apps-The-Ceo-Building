"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { loginUser } from "./actions";
import { Building2, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, null);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-surface border border-appBorder rounded-card shadow-card overflow-hidden">
        {/* Navy Header */}
        <div className="bg-primary p-6 text-white text-center border-b border-primary-hover">
          <div className="w-12 h-12 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-3">
            <Building2 className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-sm font-bold tracking-wider uppercase">
            THE CEO BUILDING
          </h1>
          <p className="text-[10px] tracking-widest text-accent font-medium uppercase mt-0.5">
            Management System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {state?.error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-700">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-appText mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-appText-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-appText mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-appText-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-appBorder rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-control text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              <span>{isPending ? "Memverifikasi..." : "Masuk ke Sistem"}</span>
              <ArrowRight className="w-4 h-4 text-accent" />
            </button>
          </form>

          {/* Public Tenant Portal Shortcut */}
          <div className="mt-6 pt-5 border-t border-appBorder text-center">
            <p className="text-xs text-appText-muted mb-2">
              Tenant gedung ingin melapor kendala?
            </p>
            <Link
              href="/tenant/submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent transition-colors"
            >
              <span>Formulir Keluhan Tenant (Tanpa Akun)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-appText-muted flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-accent" />
        <span>Sistem Operasional Resmi &mdash; The CEO Building</span>
      </div>
    </div>
  );
}
