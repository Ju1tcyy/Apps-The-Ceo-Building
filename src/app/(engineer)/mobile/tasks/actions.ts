"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function toggleTaskComplete(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const taskId = formData.get("taskId") as string;
  const isCompleted = formData.get("isCompleted") === "true";

  const task = await db.dailyTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.dailyTask.update({
    where: { id: taskId },
    data: {
      status: isCompleted ? "COMPLETED" : "PENDING",
      completedAt: isCompleted ? new Date() : null,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: isCompleted ? "DAILY_TASK_COMPLETE" : "DAILY_TASK_UNCOMPLETE",
    module: "engineering",
    entityType: "daily_task",
    entityId: task.id,
  });

  revalidatePath("/mobile/tasks");
  revalidatePath("/mobile/home");
}
