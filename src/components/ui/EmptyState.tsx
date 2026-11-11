import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-card border border-dashed border-appBorder bg-white/50 text-center flex flex-col items-center justify-center ${
        compact ? "py-6 px-4" : "py-12 px-6"
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-appText-muted mb-3">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-appText mb-1">{title}</h3>
      <p className="text-xs text-appText-muted max-w-sm mb-4">{description}</p>

      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-control bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            type="button"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-control bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
