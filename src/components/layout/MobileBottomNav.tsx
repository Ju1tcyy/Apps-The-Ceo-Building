"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wrench, CheckSquare, Calendar, User } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Beranda", href: "/mobile/home", icon: Home },
    { label: "Tiket", href: "/mobile/tickets", icon: Wrench },
    { label: "Tugas", href: "/mobile/tasks", icon: CheckSquare },
    { label: "Shift", href: "/mobile/attendance", icon: Calendar },
    { label: "Profil", href: "/mobile/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-appBorder px-3 py-2 flex items-center justify-around z-30 shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/mobile/home" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-control text-[10px] font-semibold transition-colors ${
              isActive ? "text-primary font-bold" : "text-appText-muted hover:text-primary"
            }`}
          >
            <item.icon
              className={`w-5 h-5 mb-0.5 ${
                isActive ? "text-accent stroke-[2.2]" : "text-appText-muted"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
