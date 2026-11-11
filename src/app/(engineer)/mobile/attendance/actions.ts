"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getActiveShiftName, getActiveRosterDate } from "@/lib/date";
import { revalidatePath } from "next/cache";

export async function submitClockIn(params: {
  photoData: string;
  locationId: string;
  consentGiven: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Harap login terlebih dahulu." };
  }

  if (!params.photoData || !params.locationId || !params.consentGiven) {
    return { error: "Foto live, lokasi QR, dan persetujuan PDP wajib diisi." };
  }

  // Check location
  const location = await db.location.findUnique({
    where: { id: params.locationId },
  });

  if (!location) {
    return { error: "Lokasi tidak valid." };
  }

  // Find active roster for this engineer
  const shiftName = getActiveShiftName();
  const rosterDate = getActiveRosterDate();

  const shiftDef = await db.shiftDefinition.findFirst({
    where: { name: shiftName },
  });

  let rosterId: string | null = null;
  if (shiftDef) {
    const roster = await db.shiftRoster.findFirst({
      where: {
        engineerUserId: user.id,
        shiftDefinitionId: shiftDef.id,
        shiftDate: rosterDate,
      },
    });
    if (roster) {
      rosterId = roster.id;
    }
  }

  // Check if already clocked in without clocking out
  const activeAttendance = await db.attendanceRecord.findFirst({
    where: {
      engineerUserId: user.id,
      clockOutAt: null,
    },
  });

  if (activeAttendance) {
    return { error: "Anda sudah melakukan Clock In sebelumnya. Silakan lakukan Clock Out terlebih dahulu." };
  }

  // Verification status check: flagged if location is not ceo_area
  const verificationStatus = location.areaType === "ceo_area" ? "VALID" : "FLAGGED";

  const record = await db.attendanceRecord.create({
    data: {
      engineerUserId: user.id,
      shiftRosterId: rosterId,
      clockInAt: new Date(),
      clockInPhotoPath: params.photoData.slice(0, 100) + "...[live_image]",
      clockInQrLocationId: location.id,
      consentVersion: "v1.0-pdp-30d",
      verificationStatus,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "ATTENDANCE_CLOCK_IN",
    module: "engineering",
    entityType: "attendance_record",
    entityId: record.id,
    afterJson: {
      location: location.name,
      areaType: location.areaType,
      verificationStatus,
    },
  });

  revalidatePath("/mobile/home");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function submitClockOut(params: {
  attendanceId: string;
  photoData: string;
  locationId: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Harap login terlebih dahulu." };
  }

  const attendance = await db.attendanceRecord.findUnique({
    where: { id: params.attendanceId, engineerUserId: user.id },
  });

  if (!attendance) {
    return { error: "Data kehadiran aktif tidak ditemukan." };
  }

  const record = await db.attendanceRecord.update({
    where: { id: attendance.id },
    data: {
      clockOutAt: new Date(),
      clockOutPhotoPath: params.photoData.slice(0, 100) + "...[live_image]",
      clockOutQrLocationId: params.locationId,
    },
  });

  await logAudit({
    actorUserId: user.id,
    actorRole: user.roleCodes[0],
    action: "ATTENDANCE_CLOCK_OUT",
    module: "engineering",
    entityType: "attendance_record",
    entityId: record.id,
    afterJson: {
      clockOutAt: record.clockOutAt,
    },
  });

  revalidatePath("/mobile/home");
  revalidatePath("/dashboard");
  return { success: true };
}
