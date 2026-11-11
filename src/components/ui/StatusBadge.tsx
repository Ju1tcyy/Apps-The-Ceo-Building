import React from "react";

export type StatusVariant =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "DONE"
  | "VERIFIED"
  | "CANCELLED"
  | "OVERDUE"
  | "EMERGENCY"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "ACTIVE"
  | "INACTIVE"
  | "UNPAID"
  | "PAID"
  | "PARTIALLY_PAID"
  | "DRAFT"
  | "PENDING";

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  const norm = status.toUpperCase();
  const text = label || status;

  let bg = "bg-gray-100 text-gray-700 border-gray-200";

  switch (norm) {
    case "OPEN":
      bg = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "ASSIGNED":
      bg = "bg-sky-50 text-sky-700 border-sky-200";
      break;
    case "IN_PROGRESS":
      bg = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "DONE":
      bg = "bg-teal-50 text-teal-700 border-teal-200";
      break;
    case "VERIFIED":
    case "PAID":
    case "ACTIVE":
    case "VALID":
      bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "OVERDUE":
    case "EMERGENCY":
    case "REJECTED":
      bg = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      break;
    case "HIGH":
      bg = "bg-orange-50 text-orange-700 border-orange-200";
      break;
    case "MEDIUM":
      bg = "bg-blue-50 text-blue-600 border-blue-200";
      break;
    case "LOW":
      bg = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case "UNPAID":
    case "FLAGGED":
      bg = "bg-amber-50 text-amber-800 border-amber-200";
      break;
    case "PARTIALLY_PAID":
      bg = "bg-purple-50 text-purple-700 border-purple-200";
      break;
    case "DRAFT":
    case "PENDING":
      bg = "bg-gray-100 text-gray-600 border-gray-200";
      break;
  }

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  return (
    <span className={`inline-flex items-center rounded-full border ${bg} ${sizeClass} transition-colors`}>
      {text}
    </span>
  );
}
