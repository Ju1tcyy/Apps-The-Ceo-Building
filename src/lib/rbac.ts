/**
 * Role-Based Access Control (RBAC) Specification
 * Conforms strictly to Part B.2 of THE_CEO_BUILDING_MANAGEMENT_SPEC.md
 */

export type RoleCode = "direksi" | "spv" | "manager" | "accounting" | "engineer";

export type PermissionCode =
  | "ticket.create"
  | "ticket.view_assigned"
  | "ticket.view_all"
  | "ticket.assign"
  | "ticket.reassign"
  | "ticket.update_status"
  | "ticket.verify"
  | "roster.manage"
  | "attendance.clock"
  | "daily_task.manage"
  | "inventory.view"
  | "inventory.receive"
  | "inventory.adjust"
  | "inventory.consume"
  | "inventory.stocktake"
  | "invoice.view"
  | "invoice.manage"
  | "invoice.payment_update"
  | "invoice.reminder_manage"
  | "report.view"
  | "report.export_weekly"
  | "ai.view"
  | "ai.approve"
  | "audit.view"
  | "user.manage";

/**
 * Default permission matrix for initial setup/role checking.
 * SPV is the ONLY role with report.export_weekly.
 * Direksi is view-only executive oversight.
 */
export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  direksi: [
    "ticket.view_all",
    "inventory.view",
    "invoice.view",
    "report.view",
    "ai.view",
    "audit.view",
  ],
  spv: [
    "ticket.create",
    "ticket.view_all",
    "ticket.assign",
    "ticket.reassign",
    "ticket.update_status",
    "ticket.verify",
    "roster.manage",
    "daily_task.manage",
    "inventory.view",
    "inventory.receive",
    "inventory.stocktake",
    "report.view",
    "report.export_weekly", // SPV EXCLUSIVE
    "ai.view",
    "audit.view",
  ],
  manager: [
    "ticket.create",
    "ticket.view_all",
    "ticket.assign",
    "ticket.reassign",
    "ticket.update_status",
    "inventory.view",
    "inventory.adjust", // Emergency override/adjustments
    "invoice.view",
    "invoice.manage",
    "report.view",
    "ai.view",
    "ai.approve",
    "audit.view",
    "user.manage",
  ],
  accounting: [
    "invoice.view",
    "invoice.manage",
    "invoice.payment_update",
    "invoice.reminder_manage",
    "report.view",
    "audit.view",
  ],
  engineer: [
    "ticket.view_assigned",
    "ticket.update_status",
    "attendance.clock",
    "inventory.consume",
  ],
};

export function hasPermission(
  roles: RoleCode[],
  requiredPermission: PermissionCode
): boolean {
  for (const role of roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions && permissions.includes(requiredPermission)) {
      return true;
    }
  }
  return false;
}

export function canExportWeeklyReport(roles: RoleCode[]): boolean {
  // SPV is the ONLY role authorized to export weekly report
  return roles.includes("spv");
}
