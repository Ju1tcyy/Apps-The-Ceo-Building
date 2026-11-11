"use server";

import { db } from "@/lib/db";
import { comparePassword, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { RoleCode } from "@/lib/rbac";
import { redirect } from "next/navigation";

export async function loginUser(prevState: { error?: string } | null, formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  // Check if system has no users at all
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  const user = await db.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return { error: "Email atau kata sandi tidak sesuai." };
  }

  const match = await comparePassword(password, user.passwordHash);
  if (!match) {
    return { error: "Email atau kata sandi tidak sesuai." };
  }

  const roles = user.roles.map((r) => r.role.code as RoleCode);

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    roles,
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: roles[0] || "unknown",
    action: "LOGIN",
    module: "auth",
    entityType: "user",
    entityId: user.id,
    source: "human",
  });

  // If user only has engineer role, redirect to mobile view directly
  if (roles.includes("engineer") && !roles.includes("spv") && !roles.includes("manager") && !roles.includes("direksi")) {
    redirect("/mobile/home");
  }

  redirect("/dashboard");
}
