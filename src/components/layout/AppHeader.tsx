"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Smartphone, Clock } from "lucide-react";
import { RoleCode } from "@/lib/rbac";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  userName: string;
  userRoles: RoleCode[];
  actions?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  userName,
  userRoles,
  actions,
}: AppHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isEngineer = userRoles.includes("engineer");

  return (
    <header className="h-16 bg-surface border-b border-appBorder px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-appText leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-appText-muted">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Time Badge WIB */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-appBorder rounded-control text-xs font-medium text-appText-muted">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>{timeStr || "WIB"}</span>
        </div>

        {/* Switch to Engineer Mobile View shortcut if engineer/spv/manager */}
        {isEngineer && (
          <Link
            href="/mobile/home"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary bg-accent/15 border border-accent/30 rounded-control hover:bg-accent/25 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile View</span>
          </Link>
        )}

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Notification Bell */}
        <button
          type="button"
          className="relative w-8 h-8 rounded-control border border-appBorder flex items-center justify-center text-appText-muted hover:text-primary hover:bg-slate-50 transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-appBorder">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-semibold text-xs flex items-center justify-center">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-appText leading-tight">{userName}</p>
            <p className="text-[10px] text-appText-muted capitalize">
              {userRoles.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
