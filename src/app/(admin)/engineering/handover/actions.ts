"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createShiftHandover(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const ticketId = formData.get("ticketId") as string;
  const toEngineerId = (formData.get("toEngineerId") as string) || null;
  const conditionSummary = formData.get("conditionSummary") as string;
  const completedWork = formData.get("completedWork") as string;
  const remainingWork = formData.get("remainingWork") as string;
  const riskNotes = (formData.get("riskNotes") as string) || null;

  if (!ticketId || !conditionSummary || !completedWork || !remainingWork) {
    return;
  }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  const handover = await db.shiftHandover.create({
    data: {
      ticketId,
      fromEngineerId: user.id,
      toEngineerId,
      conditionSummary,
      completedWork,
      remainingWork,
      riskNotes,
    },
    include: {
      fromEngineer: true,
      toEngineer: true,
      ticket: true,
    },
  });

  await db.ticketEvent.create({
    data: {
      ticketId,
      actorUserId: user.id,
      eventType: "SHIFT_HANDOVER",
      note: `Serah terima shift dari ${handover.fromEngineer.name}. Kondisi: ${conditionSummary}`,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "SHIFT_HANDOVER_CREATE",
    module: "engineering",
    entityType: "shift_handover",
    entityId: handover.id,
    afterJson: {
      ticketNumber: ticket.ticketNumber,
      from: handover.fromEngineer.name,
      to: handover.toEngineer?.name || "Next Shift Standby",
    },
  });

  revalidatePath("/engineering/handover");
  revalidatePath(`/engineering/tickets/${ticketId}`);
}
