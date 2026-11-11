import { db } from "./db";
import { getActiveShiftName, getActiveRosterDate } from "./date";

export interface AutoAssignResult {
  assigned: boolean;
  engineerId: string | null;
  reason: string;
  shiftName: string;
  rosterDate: string;
}

/**
 * Evaluates auto-assignment eligibility according to building rules:
 * 1. Checks active shift in Asia/Jakarta.
 * 2. Checks active scheduled engineer on the shift roster.
 * 3. Verifies that engineer has clocked in to the CEO area and status is VALID.
 */
export async function evaluateAutoAssignment(now: Date = new Date()): Promise<AutoAssignResult> {
  const shiftName = getActiveShiftName(now);
  const rosterDate = getActiveRosterDate(now);

  const shiftDef = await db.shiftDefinition.findFirst({
    where: { name: shiftName, isActive: true },
  });

  if (!shiftDef) {
    return {
      assigned: false,
      engineerId: null,
      reason: `Definisi shift '${shiftName}' belum dikonfigurasi.`,
      shiftName,
      rosterDate,
    };
  }

  const roster = await db.shiftRoster.findFirst({
    where: {
      shiftDefinitionId: shiftDef.id,
      shiftDate: rosterDate,
    },
    include: {
      engineer: {
        include: {
          attendances: {
            where: {
              clockOutAt: null,
              verificationStatus: "VALID",
            },
            include: {
              clockInLocation: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!roster || !roster.engineer) {
    return {
      assigned: false,
      engineerId: null,
      reason: `Tidak ada teknisi standby yang terdaftar pada roster ${shiftName} tanggal ${rosterDate}.`,
      shiftName,
      rosterDate,
    };
  }

  const activeAttendance = roster.engineer.attendances[0];
  if (!activeAttendance) {
    return {
      assigned: false,
      engineerId: null,
      reason: `Teknisi standby (${roster.engineer.name}) belum melakukan Clock In untuk shift ini.`,
      shiftName,
      rosterDate,
    };
  }

  // Verify clock in location is in CEO Area
  if (activeAttendance.clockInLocation?.areaType !== "ceo_area") {
    return {
      assigned: false,
      engineerId: null,
      reason: `Teknisi standby (${roster.engineer.name}) tidak terdaftar Clock In di Area CEO.`,
      shiftName,
      rosterDate,
    };
  }

  return {
    assigned: true,
    engineerId: roster.engineerUserId,
    reason: `Ditugaskan otomatis ke teknisi standby aktif (${roster.engineer.name}) pada ${shiftName}.`,
    shiftName,
    rosterDate,
  };
}
