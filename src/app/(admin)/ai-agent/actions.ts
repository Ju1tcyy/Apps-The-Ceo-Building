"use server";

import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  scanOperationalInsights,
  approveAiRecommendation,
  rejectAiRecommendation,
} from "@/lib/ai-agent";

export async function triggerAiScanAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await scanOperationalInsights(user.id);
  revalidatePath("/ai-agent");
  revalidatePath("/dashboard");
}

export async function approveRecommendationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const recommendationId = formData.get("recommendationId") as string;
  const decisionNote = formData.get("decisionNote") as string;

  if (!recommendationId) throw new Error("ID Rekomendasi diperlukan");

  const role = user.roleCodes[0] || "staff";
  await approveAiRecommendation(recommendationId, user.id, role, decisionNote || undefined);

  revalidatePath("/ai-agent");
  revalidatePath("/dashboard");
}

export async function rejectRecommendationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const recommendationId = formData.get("recommendationId") as string;
  const decisionNote = formData.get("decisionNote") as string;

  if (!recommendationId) throw new Error("ID Rekomendasi diperlukan");

  const role = user.roleCodes[0] || "staff";
  await rejectAiRecommendation(recommendationId, user.id, role, decisionNote || undefined);

  revalidatePath("/ai-agent");
  revalidatePath("/dashboard");
}
