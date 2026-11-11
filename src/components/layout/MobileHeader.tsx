"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, User, Clock, Building2 } from "lucide-react";
import { RoleCode } from "@/lib/rbac";

interface MobileHeaderProps {
  userName: string;
  userRoles: RoleCode[];
  title?: string;
  subtitle?: string;
  backHref?: string;
}

export function MobileHeader({
  userName,
  userRoles,
  title,
  subtitle,
  backHref,
}: MobileHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const primaryRole = userRoles[0]?.toUpperCase() || "STAFF";

  return (
    <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 shadow-md">
      <div className="flex items-center justify-between">
        {/* Brand & Active Role */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wider text-white">THE CEO</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-accent text-primary rounded font-mono">
                {primaryRole}
              </span>
            </div>
            <p className="text-[10px] text-slate-300">Building Management</p>
          </div>
        </Link>

        {/* Right Actions: Time, Notifications & Profile */}
        <div className="flex items-center gap-2">
          {timeStr && (
            <span className="text-[10px] font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-accent" />
              <span>{timeStr}</span>
            </span>
          )}

          <Link
            href="/notifications"
            className="relative w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
            title="Pusat Notifikasi"
          >
            <Bell className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/profile"
            className="w-7 h-7 rounded-full bg-accent/30 border border-accent/60 flex items-center justify-center text-accent text-xs font-bold hover:bg-accent hover:text-primary transition-colors"
            title={userName}
          >
            {userName ? userName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </Link>
        </div>
      </div>

      {/* Optional Page Subheader */}
      {title && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">{title}</h1>
            {subtitle && <p className="text-[11px] text-slate-300">{subtitle}</p>}
          </div>
          {backHref && (
            <Link
              href={backHref}
              className="text-xs text-accent hover:underline font-semibold"
            >
              ← Kembali
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
