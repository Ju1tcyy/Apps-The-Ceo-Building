"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { evaluateAutoAssignment } from "@/lib/assignment";
import { calculateResponseDueAt } from "@/lib/sla";
import { getJakartaTime } from "@/lib/date";
import { recordTicketConsumption } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateTicketNumber(seq: number): string {
  const { dateStr } = getJakartaTime();
  const cleanDate = dateStr.replace(/-/g, "");
  const padSeq = seq.toString().padStart(4, "0");
  return `TC-${cleanDate}-${padSeq}`;
}

export async function createPublicTenantTicket(formData: FormData): Promise<void> {
  const requesterName = formData.get("requesterName") as string;
  const requesterContact = formData.get("requesterContact") as string;
  const unitId = (formData.get("unitId") as string) || null;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;

  if (!requesterName || !requesterContact || !category || !description) {
    return;
  }

  let locationId = "";
  let tenantId: string | null = null;

  if (unitId) {
    const unit = await db.unit.findUnique({
      where: { id: unitId },
      include: { tenant: true },
    });
    if (unit) {
      tenantId = unit.tenantId;
      const matchedLoc = await db.location.findFirst({
        where: { floor: unit.floor },
      });
      if (matchedLoc) {
        locationId = matchedLoc.id;
      }
    }
  }

  if (!locationId) {
    let defaultLoc = await db.location.findFirst();
    if (!defaultLoc) {
      defaultLoc = await db.location.create({
        data: {
          name: "Area Gedung The CEO",
          floor: "Lantai 1",
          areaType: "ceo_area",
        },
      });
    }
    locationId = defaultLoc.id;
  }

  const countToday = await db.ticket.count();
  const ticketNumber = generateTicketNumber(countToday + 1);

  const autoAssign = await evaluateAutoAssignment();
  const status = autoAssign.assigned ? "ASSIGNED" : "OPEN";
  const priority = "MEDIUM";
  const responseDueAt = calculateResponseDueAt(priority);

  const ticket = await db.ticket.create({
    data: {
      ticketNumber,
      source: "public_form",
      requesterName,
      requesterContact,
      tenantId,
      unitId,
      locationId,
      category,
      description,
      priority,
      status,
      assignedEngineerId: autoAssign.assigned ? autoAssign.engineerId : null,
      responseDueAt,
      events: {
        create: [
          {
            eventType: "TICKET_CREATED",
            newValue: status,
            note: `Tiket diajukan oleh tenant via public form. ${autoAssign.reason}`,
          },
        ],
      },
    },
  });

  await logAudit({
    actorUserId: null,
    actorRole: "public_tenant",
    action: "TICKET_CREATE_PUBLIC",
    module: "engineering",
    entityType: "ticket",
    entityId: ticket.id,
    afterJson: {
      ticketNumber,
      category,
      status,
      assignedEngineerId: ticket.assignedEngineerId,
      assignmentReason: autoAssign.reason,
    },
    source: "human",
  });

  redirect(`/tenant/track?ticket=${ticket.ticketNumber}`);
}

export async function createInternalTicket(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const requesterName = formData.get("requesterName") as string;
  const requesterContact = formData.get("requesterContact") as string;
  const source = (formData.get("source") as string) || "internal";
  const locationId = formData.get("locationId") as string;
  const category = formData.get("category") as string;
  const priority = (formData.get("priority") as string) || "MEDIUM";
  const description = formData.get("description") as string;
  const manualEngineerId = (formData.get("assignedEngineerId") as string) || null;

  if (!requesterName || !locationId || !category || !description) {
    return;
  }

  const countToday = await db.ticket.count();
  const ticketNumber = generateTicketNumber(countToday + 1);
  const responseDueAt = calculateResponseDueAt(priority);

  let status = "OPEN";
  let assignedEngineerId: string | null = manualEngineerId;
  let assignmentNote = "";

  if (manualEngineerId) {
    status = "ASSIGNED";
    assignmentNote = "Ditugaskan secara manual oleh SPV/Manager.";
  } else {
    const autoAssign = await evaluateAutoAssignment();
    if (autoAssign.assigned) {
      status = "ASSIGNED";
      assignedEngineerId = autoAssign.engineerId;
      assignmentNote = autoAssign.reason;
    } else {
      assignmentNote = autoAssign.reason;
    }
  }

  const ticket = await db.ticket.create({
    data: {
      ticketNumber,
      source,
      requesterName,
      requesterContact: requesterContact || "—",
      locationId,
      category,
      description,
      priority,
      status,
      assignedEngineerId,
      responseDueAt,
      createdBy: user.id,
      events: {
        create: [
          {
            actorUserId: user.id,
            eventType: "TICKET_CREATED",
            newValue: status,
            note: assignmentNote,
          },
        ],
      },
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "TICKET_CREATE_INTERNAL",
    module: "engineering",
    entityType: "ticket",
    entityId: ticket.id,
    afterJson: { ticketNumber, status, priority, assignedEngineerId },
  });

  revalidatePath("/engineering");
  revalidatePath("/dashboard");
  redirect(`/engineering/tickets/${ticket.id}`);
}

export async function updateTicketStatus(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const ticketId = formData.get("ticketId") as string;
  const nextStatus = formData.get("nextStatus") as string;
  const note = (formData.get("note") as string) || "";

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return;

  // Validation: Engineer CANNOT verify ticket
  if (nextStatus === "VERIFIED") {
    if (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager")) {
      return;
    }
    if (ticket.assignedEngineerId === user.id) {
      return;
    }
  }

  const now = new Date();
  const updateData: any = {
    status: nextStatus,
  };

  if (!ticket.firstResponseAt && (nextStatus === "IN_PROGRESS" || nextStatus === "ASSIGNED")) {
    updateData.firstResponseAt = now;
  }
  if (nextStatus === "IN_PROGRESS" && !ticket.startedAt) {
    updateData.startedAt = now;
  }
  if (nextStatus === "DONE" && !ticket.doneAt) {
    updateData.doneAt = now;

    // Process consumable deductions atomically & idempotently
    const consumableItemId = formData.get("consumableItemId") as string;
    const consumableQty = parseInt(formData.get("consumableQty") as string, 10);
    if (consumableItemId && consumableQty > 0) {
      const idempotencyKey = `ticket-${ticketId}-done-${ticket.updatedAt.getTime()}`;
      await recordTicketConsumption({
        ticketId: ticket.id,
        consumables: [{ inventoryItemId: consumableItemId, quantityUsed: consumableQty }],
        recordedByUserId: user.id,
        userRole: user.roleCodes[0],
        idempotencyKey,
      });
    }
  }
  if (nextStatus === "VERIFIED" && !ticket.verifiedAt) {
    updateData.verifiedAt = now;
  }

  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: {
      ...updateData,
      events: {
        create: {
          actorUserId: user.id,
          eventType: "STATUS_CHANGE",
          previousValue: ticket.status,
          newValue: nextStatus,
          note,
        },
      },
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: `TICKET_STATUS_${nextStatus}`,
    module: "engineering",
    entityType: "ticket",
    entityId: ticket.id,
    beforeJson: { status: ticket.status },
    afterJson: { status: nextStatus, note },
  });

  revalidatePath(`/engineering/tickets/${ticketId}`);
  revalidatePath("/engineering");
  revalidatePath("/dashboard");
}

export async function reassignTicket(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const ticketId = formData.get("ticketId") as string;
  const engineerId = formData.get("engineerId") as string;
  const reason = (formData.get("reason") as string) || "Penugasan ulang oleh SPV";

  const engineer = await db.user.findUnique({ where: { id: engineerId } });
  if (!engineer) return;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      assignedEngineerId: engineer.id,
      status: "ASSIGNED",
      events: {
        create: {
          actorUserId: user.id,
          eventType: "REASSIGNMENT",
          previousValue: ticket.assignedEngineerId,
          newValue: engineer.id,
          note: `Dialihkan ke ${engineer.name}. Alasan: ${reason}`,
        },
      },
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "TICKET_REASSIGN",
    module: "engineering",
    entityType: "ticket",
    entityId: ticket.id,
    afterJson: { assignedEngineer: engineer.name, reason },
  });

  revalidatePath(`/engineering/tickets/${ticketId}`);
  revalidatePath("/engineering");
}
