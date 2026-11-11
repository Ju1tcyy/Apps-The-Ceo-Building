"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleCode } from "@/lib/rbac";
import {
  Home,
  Wrench,
  CheckSquare,
  Calendar,
  User,
  LayoutDashboard,
  FileSpreadsheet,
  Boxes,
  ReceiptText,
  Bot,
  BellRing,
  ShieldCheck,
} from "lucide-react";

interface RoleBottomNavProps {
  userRoles: RoleCode[];
}

export function RoleBottomNav({ userRoles }: RoleBottomNavProps) {
  const pathname = usePathname();

  // Role prioritization: engineer > spv > manager > accounting > direksi
  const isEngineer = userRoles.includes("engineer") && !userRoles.includes("spv") && !userRoles.includes("manager");
  const isSpv = userRoles.includes("spv");
  const isManager = userRoles.includes("manager") && !userRoles.includes("spv");
  const isAccounting = userRoles.includes("accounting") && !userRoles.includes("manager") && !userRoles.includes("spv");
  const isDireksi = userRoles.includes("direksi") && !userRoles.includes("spv") && !userRoles.includes("manager");

  let navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tiket", href: "/engineering", icon: Wrench },
    { label: "Stok", href: "/inventory", icon: Boxes },
    { label: "Billing", href: "/billing", icon: ReceiptText },
    { label: "Profil", href: "/profile", icon: User },
  ];

  if (isEngineer) {
    navItems = [
      { label: "Beranda", href: "/mobile/home", icon: Home },
      { label: "Tiket", href: "/mobile/tickets", icon: Wrench },
      { label: "Tugas", href: "/mobile/tasks", icon: CheckSquare },
      { label: "Shift", href: "/mobile/attendance", icon: Calendar },
      { label: "Profil", href: "/profile", icon: User },
    ];
  } else if (isSpv) {
    navItems = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Tiket", href: "/engineering", icon: Wrench },
      { label: "Roster", href: "/engineering/roster", icon: Calendar },
      { label: "Laporan", href: "/reports", icon: FileSpreadsheet },
      { label: "Profil", href: "/profile", icon: User },
    ];
  } else if (isManager) {
    navItems = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Approval", href: "/ai-agent", icon: Bot },
      { label: "Stok", href: "/inventory", icon: Boxes },
      { label: "Billing", href: "/billing", icon: ReceiptText },
      { label: "Profil", href: "/profile", icon: User },
    ];
  } else if (isAccounting) {
    navItems = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Tagihan", href: "/billing", icon: ReceiptText },
      { label: "Reminder", href: "/billing/reminders", icon: BellRing },
      { label: "Audit", href: "/audit-log", icon: ShieldCheck },
      { label: "Profil", href: "/profile", icon: User },
    ];
  } else if (isDireksi) {
    navItems = [
      { label: "Executive", href: "/dashboard", icon: LayoutDashboard },
      { label: "Insights", href: "/ai-agent", icon: Bot },
      { label: "Laporan", href: "/reports", icon: FileSpreadsheet },
      { label: "Audit", href: "/audit-log", icon: ShieldCheck },
      { label: "Profil", href: "/profile", icon: User },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-appBorder px-2 py-1.5 flex items-center justify-around z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && item.href !== "/mobile/home" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-control min-w-[56px] transition-colors ${
              isActive ? "text-primary font-bold" : "text-appText-muted hover:text-primary"
            }`}
          >
            <item.icon
              className={`w-5 h-5 mb-0.5 transition-transform ${
                isActive ? "text-accent stroke-[2.2] scale-110" : "text-appText-muted"
              }`}
            />
            <span
              className={`text-[10px] leading-tight ${
                isActive ? "text-primary font-bold" : "text-appText-muted font-medium"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
