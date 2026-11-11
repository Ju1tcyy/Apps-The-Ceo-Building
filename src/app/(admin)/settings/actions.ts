"use server";

import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function createLocation(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const name = formData.get("name") as string;
  const floor = formData.get("floor") as string;
  const areaType = formData.get("areaType") as string;

  if (!name || !floor || !areaType) {
    return;
  }

  const location = await db.location.create({
    data: {
      name,
      floor,
      areaType,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "LOCATION_CREATE",
    module: "engineering",
    entityType: "location",
    entityId: location.id,
    afterJson: { name, floor, areaType },
  });

  revalidatePath("/settings");
}

export async function createTenant(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const tenantName = formData.get("tenantName") as string;
  const contactName = formData.get("contactName") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const contactEmail = formData.get("contactEmail") as string;

  if (!tenantName || !contactName || !contactPhone || !contactEmail) {
    return;
  }

  const tenant = await db.tenant.create({
    data: {
      tenantName,
      contactName,
      contactPhone,
      contactEmail,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "TENANT_CREATE",
    module: "engineering",
    entityType: "tenant",
    entityId: tenant.id,
    afterJson: { tenantName, contactName, contactPhone },
  });

  revalidatePath("/settings");
}

export async function createUnit(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const unitCode = formData.get("unitCode") as string;
  const floor = formData.get("floor") as string;
  const tenantId = (formData.get("tenantId") as string) || null;

  if (!unitCode || !floor) {
    return;
  }

  const rawToken = `UNIT-${unitCode}-${crypto.randomBytes(16).toString("hex")}`;
  const qrTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const unit = await db.unit.create({
    data: {
      unitCode,
      floor,
      tenantId: tenantId && tenantId !== "" ? tenantId : null,
      qrTokenHash,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "UNIT_CREATE",
    module: "engineering",
    entityType: "unit",
    entityId: unit.id,
    afterJson: { unitCode, floor, tenantId },
  });

  revalidatePath("/settings");
}

export async function createEngineerAccount(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const employeeCode = formData.get("employeeCode") as string;

  if (!name || !email || !password || !employeeCode) {
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return;
  }

  const engineerRole = await db.role.findUnique({ where: { code: "engineer" } });
  if (!engineerRole) {
    return;
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await db.user.create({
    data: {
      name,
      email,
      employeeCode,
      passwordHash: hashedPassword,
      roles: {
        create: {
          roleId: engineerRole.id,
        },
      },
      engineerProfile: {
        create: {
          employeeCode,
        },
      },
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "ENGINEER_CREATE",
    module: "user",
    entityType: "user",
    entityId: newUser.id,
    afterJson: { name, email, employeeCode },
  });

  revalidatePath("/settings");
}
