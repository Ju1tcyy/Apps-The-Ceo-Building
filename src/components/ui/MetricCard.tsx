import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  highlight?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = false,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card p-5 border transition-all ${
        highlight
          ? "bg-primary text-white border-primary shadow-md"
          : "bg-surface text-appText border-appBorder shadow-card hover:shadow-cardHover"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div
            className={`w-10 h-10 rounded-control flex items-center justify-center ${
              highlight ? "bg-white/10 text-accent" : "bg-primary/5 text-primary"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              highlight
                ? "bg-white/20 text-white"
                : trend.isNeutral
                ? "bg-gray-100 text-appText-muted"
                : trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4
          className={`text-2xl font-bold tracking-tight ${
            highlight ? "text-white" : "text-appText"
          }`}
        >
          {value}
        </h4>
        <p
          className={`text-xs font-medium ${
            highlight ? "text-white/80" : "text-appText-muted"
          }`}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className={`text-[11px] ${
              highlight ? "text-white/60" : "text-appText-subtle"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
