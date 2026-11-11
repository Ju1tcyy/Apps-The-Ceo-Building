"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function assignShiftRoster(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const shiftDefinitionId = formData.get("shiftDefinitionId") as string;
  const engineerUserId = formData.get("engineerUserId") as string;
  const shiftDate = formData.get("shiftDate") as string; // YYYY-MM-DD

  if (!shiftDefinitionId || !engineerUserId || !shiftDate) {
    return;
  }

  // 1. Check if the engineer is already assigned to a shift on the same date (anti-bentrok)
  const existingSameDay = await db.shiftRoster.findFirst({
    where: {
      engineerUserId,
      shiftDate,
    },
    include: {
      shiftDefinition: true,
    },
  });

  if (existingSameDay && existingSameDay.shiftDefinitionId !== shiftDefinitionId) {
    // Conflict detected: skip to prevent duplicate shift on same day
    return;
  }

  // 2. Check if this shift on this date already has an assigned engineer
  const existingShiftSlot = await db.shiftRoster.findFirst({
    where: {
      shiftDefinitionId,
      shiftDate,
    },
    include: { engineer: true },
  });

  if (existingShiftSlot) {
    // Update existing slot with new engineer
    const updated = await db.shiftRoster.update({
      where: { id: existingShiftSlot.id },
      data: {
        engineerUserId,
        createdBy: user.id,
      },
      include: { shiftDefinition: true, engineer: true },
    });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "ROSTER_REASSIGN",
      module: "engineering",
      entityType: "shift_roster",
      entityId: updated.id,
      afterJson: { shiftDate, shift: updated.shiftDefinition.name, engineer: updated.engineer.name },
    });
  } else {
    // Create new roster entry
    const created = await db.shiftRoster.create({
      data: {
        shiftDefinitionId,
        engineerUserId,
        shiftDate,
        createdBy: user.id,
      },
      include: { shiftDefinition: true, engineer: true },
    });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "ROSTER_ASSIGN",
      module: "engineering",
      entityType: "shift_roster",
      entityId: created.id,
      afterJson: { shiftDate, shift: created.shiftDefinition.name, engineer: created.engineer.name },
    });
  }

  revalidatePath("/engineering/roster");
  revalidatePath("/dashboard");
}
