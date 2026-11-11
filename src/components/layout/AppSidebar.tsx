"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Boxes,
  ReceiptText,
  Bot,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { RoleCode } from "@/lib/rbac";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: RoleCode[];
}

interface AppSidebarProps {
  userRoles: RoleCode[];
  userName: string;
  userEmail: string;
}

export function AppSidebar({ userRoles, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();

  const isDireksi = userRoles.includes("direksi");
  const isEngineer = userRoles.includes("engineer") && userRoles.length === 1;

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Engineering",
      href: "/engineering",
      icon: Wrench,
    },
    {
      label: "Inventory",
      href: "/inventory",
      icon: Boxes,
    },
    {
      label: "Billing",
      href: "/billing",
      icon: ReceiptText,
    },
    {
      label: "AI Agent",
      href: "/ai-agent",
      icon: Bot,
    },
    {
      label: "Reports",
      href: "/reports",
      icon: FileSpreadsheet,
    },
    {
      label: "Audit Log",
      href: "/audit-log",
      icon: ShieldCheck,
    },
    {
      label: "Master Data",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-primary text-white flex flex-col flex-shrink-0 min-h-screen select-none border-r border-primary-hover">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-control bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
          <Building2 className="w-6 h-6 stroke-[2]" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wider uppercase text-white flex items-center gap-1.5">
            THE CEO
          </h1>
          <p className="text-[10px] tracking-widest text-accent font-medium uppercase">
            BUILDING MANAGEMENT
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-white/40">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-control text-xs font-medium transition-all ${
                isActive
                  ? "bg-accent text-primary font-semibold shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${
                  isActive ? "text-primary stroke-[2.2]" : "text-white/70"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/10 bg-primary-hover/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center border border-accent/30 flex-shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{userName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {userRoles.map((r) => (
                  <span
                    key={r}
                    className="text-[9px] uppercase px-1.5 py-0.2 bg-white/10 text-accent font-semibold rounded"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 border border-transparent rounded-control transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
