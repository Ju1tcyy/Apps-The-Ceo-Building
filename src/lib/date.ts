/**
 * Date & Time Utilities for The CEO Building Management System
 * Single Source of Truth Timezone: Asia/Jakarta (WIB, UTC+7)
 */

export const TIMEZONE = "Asia/Jakarta";

export interface JakartaTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
}

export function getJakartaTime(date: Date = new Date()): JakartaTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = p.value;
    }
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hour = parseInt(partMap.hour, 10);
  if (hour === 24) hour = 0; // standard 0-23
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${pad(hour)}:${pad(minute)}`;

  return { year, month, day, hour, minute, second, dateStr, timeStr };
}

/**
 * Determine active shift name for a given timestamp in Asia/Jakarta.
 * Shift 1: 06:00 - 13:59:59 (Pagi)
 * Shift 2: 14:00 - 21:59:59 (Siang)
 * Shift 3: 22:00 - 05:59:59 (Malam, crosses midnight)
 */
export function getActiveShiftName(date: Date = new Date()): "Shift 1" | "Shift 2" | "Shift 3" {
  const { hour } = getJakartaTime(date);
  if (hour >= 6 && hour < 14) {
    return "Shift 1";
  } else if (hour >= 14 && hour < 22) {
    return "Shift 2";
  } else {
    return "Shift 3";
  }
}

/**
 * For Shift 3 (22:00 - 06:00), if the current hour is between 00:00 and 05:59,
 * the shift roster date belongs to the previous calendar day when the shift started.
 */
export function getActiveRosterDate(date: Date = new Date()): string {
  const jt = getJakartaTime(date);
  if (jt.hour < 6) {
    // Subtract 1 day for roster date
    const prevDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    return getJakartaTime(prevDate).dateStr;
  }
  return jt.dateStr;
}

export function formatWIB(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) + " WIB";
}

export function formatWIBDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
