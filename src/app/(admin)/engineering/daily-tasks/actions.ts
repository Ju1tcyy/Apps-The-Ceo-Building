"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createDailyTask(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const locationId = formData.get("locationId") as string;
  const assignedEngineerId = (formData.get("assignedEngineerId") as string) || null;
  const priority = (formData.get("priority") as string) || "MEDIUM";

  if (!title || !locationId) {
    return;
  }

  const task = await db.dailyTask.create({
    data: {
      title,
      description,
      locationId,
      assignedEngineerId,
      priority,
      status: "PENDING",
      createdBy: user.id,
    },
    include: { location: true },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "DAILY_TASK_CREATE",
    module: "engineering",
    entityType: "daily_task",
    entityId: task.id,
    afterJson: { title, location: task.location.name, priority },
  });

  revalidatePath("/engineering/daily-tasks");
  revalidatePath("/dashboard");
}
