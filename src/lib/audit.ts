import { db } from "./db";

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  actorRole: string;
  action: string; // LOGIN, LOGOUT, TICKET_CREATE, STATUS_CHANGE, ROSTER_CREATE, ATTENDANCE_CLOCK, EXPORT_REPORT, etc.
  module: string; // auth, engineering, inventory, billing, ai, report, user
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  source?: "human" | "system" | "ai";
  requestId?: string;
}

/**
 * Append-only audit logger.
 * Never modifies or deletes past records.
 */
export async function logAudit(params: CreateAuditLogParams) {
  try {
    return await db.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorRole: params.actorRole,
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeJson: params.beforeJson ? JSON.stringify(params.beforeJson) : null,
        afterJson: params.afterJson ? JSON.stringify(params.afterJson) : null,
        source: params.source || "human",
        requestId: params.requestId || null,
      },
    });
  } catch (error) {
    // Audit log failure should be printed to console so it's not silently lost
    console.error("[CRITICAL] Failed to write audit log:", error, params);
  }
}
