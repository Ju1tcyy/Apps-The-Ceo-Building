/**
 * SLA Policy & Response Threshold Utilities
 * Conformed with confirmed business rules:
 * - Strict Response Threshold for SPV Escalation
 * - Open-ended Resolution Target (no rigid penalty due to physical unpredictability)
 */

export const RESPONSE_THRESHOLDS_MINUTES: Record<string, number> = {
  EMERGENCY: 15,
  HIGH: 30,
  MEDIUM: 60,
  LOW: 120,
};

export function calculateResponseDueAt(
  priority: string,
  createdAt: Date = new Date()
): Date {
  const normPriority = priority.toUpperCase();
  const minutes = RESPONSE_THRESHOLDS_MINUTES[normPriority] ?? 60;
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

export function isResponseOverdue(
  responseDueAt: Date | null | undefined,
  firstResponseAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!responseDueAt) return false;
  // If first response already recorded, check if it occurred before responseDueAt
  if (firstResponseAt) {
    return firstResponseAt.getTime() > responseDueAt.getTime();
  }
  // If not responded yet, check against now
  return now.getTime() > responseDueAt.getTime();
}
