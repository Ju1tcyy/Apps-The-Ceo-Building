"use server";

import { db } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ROLE_PERMISSIONS, RoleCode } from "@/lib/rbac";
import { redirect } from "next/navigation";

export async function bootstrapSystem(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleCode = (formData.get("role") as RoleCode) || "spv";

  if (!name || !email || !password || password.length < 8) {
    return { error: "Semua data wajib diisi dan password minimal 8 karakter." };
  }

  // 1. Verify that database is completely empty of users
  const userCount = await db.user.count();
  if (userCount > 0) {
    return { error: "Setup awal telah selesai sebelumnya. Silakan login." };
  }

  // 2. Initialize technical roles if not yet seeded
  const defaultRoles = [
    { code: "direksi", name: "Direksi" },
    { code: "spv", name: "Supervisor (SPV)" },
    { code: "manager", name: "Manager Operasional" },
    { code: "accounting", name: "Accounting / Finance" },
    { code: "engineer", name: "Engineer Lapangan" },
  ];

  for (const r of defaultRoles) {
    await db.role.upsert({
      where: { code: r.code },
      update: {},
      create: { code: r.code, name: r.name },
    });
  }

  // 3. Initialize default technical permissions
  const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
  const uniquePerms = Array.from(new Set(allPermissions));

  for (const permCode of uniquePerms) {
    const perm = await db.permission.upsert({
      where: { code: permCode },
      update: {},
      create: { code: permCode, description: `Hak akses untuk ${permCode}` },
    });

    // Link to roles
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (perms.includes(permCode as any)) {
        const dbRole = await db.role.findUnique({ where: { code: role } });
        if (dbRole) {
          await db.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: dbRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: dbRole.id,
              permissionId: perm.id,
            },
          });
        }
      }
    }
  }

  // 4. Initialize standard Shift Definitions (confirmed by user)
  const defaultShifts = [
    { name: "Shift 1", startTime: "06:00", endTime: "14:00", crossesMidnight: false },
    { name: "Shift 2", startTime: "14:00", endTime: "22:00", crossesMidnight: false },
    { name: "Shift 3", startTime: "22:00", endTime: "06:00", crossesMidnight: true },
  ];

  for (const s of defaultShifts) {
    const existing = await db.shiftDefinition.findFirst({ where: { name: s.name } });
    if (!existing) {
      await db.shiftDefinition.create({
        data: s,
      });
    }
  }

  // 5. Create First Admin User
  const hashedPassword = await hashPassword(password);
  const targetRole = await db.role.findUnique({ where: { code: roleCode } });
  if (!targetRole) {
    return { error: "Role tidak valid." };
  }

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      isActive: true,
      roles: {
        create: {
          roleId: targetRole.id,
        },
      },
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  // 6. Record Initial Audit Log
  await logAudit({
    actorUserId: user.id,
    actorRole: roleCode,
    action: "SYSTEM_BOOTSTRAP",
    module: "auth",
    entityType: "user",
    entityId: user.id,
    afterJson: { email: user.email, name: user.name, role: roleCode },
    source: "human",
  });

  // 7. Auto login session
  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    roles: [roleCode],
  });

  redirect("/dashboard");
}
