import test from "node:test";
import assert from "node:assert/strict";

// 1. SLA Calculation & Overdue Detection Test
test("SLA: Response thresholds calculated accurately per priority", () => {
  const RESPONSE_THRESHOLDS = {
    EMERGENCY: 15,
    HIGH: 30,
    MEDIUM: 60,
    LOW: 120,
  };

  const baseTime = new Date("2026-11-08T10:00:00Z");

  function calcDue(priority, created) {
    const min = RESPONSE_THRESHOLDS[priority] || 60;
    return new Date(created.getTime() + min * 60 * 1000);
  }

  // Emergency: +15 min
  const emergencyDue = calcDue("EMERGENCY", baseTime);
  assert.equal(emergencyDue.toISOString(), "2026-11-08T10:15:00.000Z");

  // High: +30 min
  const highDue = calcDue("HIGH", baseTime);
  assert.equal(highDue.toISOString(), "2026-11-08T10:30:00.000Z");

  // Medium: +60 min
  const mediumDue = calcDue("MEDIUM", baseTime);
  assert.equal(mediumDue.toISOString(), "2026-11-08T11:00:00.000Z");

  // Low: +120 min
  const lowDue = calcDue("LOW", baseTime);
  assert.equal(lowDue.toISOString(), "2026-11-08T12:00:00.000Z");
});

test("SLA: Overdue detection before first response vs after first response", () => {
  const due = new Date("2026-11-08T10:15:00Z");

  function isOverdue(dueAt, firstResp, now) {
    if (firstResp) return firstResp.getTime() > dueAt.getTime();
    return now.getTime() > dueAt.getTime();
  }

  // 1. Not responded yet, current time is 10:10 (within SLA) -> false
  assert.equal(isOverdue(due, null, new Date("2026-11-08T10:10:00Z")), false);

  // 2. Not responded yet, current time is 10:16 (past SLA) -> true (Overdue!)
  assert.equal(isOverdue(due, null, new Date("2026-11-08T10:16:00Z")), true);

  // 3. Responded at 10:12 (before due) even if now is 11:00 -> false
  assert.equal(isOverdue(due, new Date("2026-11-08T10:12:00Z"), new Date("2026-11-08T11:00:00Z")), false);

  // 4. Responded late at 10:20 -> true
  assert.equal(isOverdue(due, new Date("2026-11-08T10:20:00Z"), new Date("2026-11-08T11:00:00Z")), true);
});

// 2. Auto-Assignment Engine Simulation Test
test("Auto-Assignment: Only assigns when roster exists AND engineer is clocked in at CEO area", () => {
  function evaluateAssignment({ roster, activeClockIn }) {
    if (!roster) {
      return { assigned: false, reason: "No roster scheduled" };
    }
    if (!activeClockIn) {
      return { assigned: false, reason: "Engineer has not clocked in" };
    }
    if (activeClockIn.areaType !== "ceo_area") {
      return { assigned: false, reason: "Engineer not in CEO area" };
    }
    return { assigned: true, engineerId: roster.engineerId, reason: "Assigned" };
  }

  // Case 1: No roster
  const case1 = evaluateAssignment({ roster: null, activeClockIn: null });
  assert.equal(case1.assigned, false);
  assert.equal(case1.reason, "No roster scheduled");

  // Case 2: Roster exists, but engineer not clocked in
  const case2 = evaluateAssignment({
    roster: { engineerId: "eng-1" },
    activeClockIn: null,
  });
  assert.equal(case2.assigned, false);
  assert.equal(case2.reason, "Engineer has not clocked in");

  // Case 3: Roster exists, engineer clocked in but in wrong area (e.g. parking)
  const case3 = evaluateAssignment({
    roster: { engineerId: "eng-1" },
    activeClockIn: { areaType: "parking" },
  });
  assert.equal(case3.assigned, false);
  assert.equal(case3.reason, "Engineer not in CEO area");

  // Case 4: Roster exists AND engineer clocked in at CEO Area -> SUCCESS
  const case4 = evaluateAssignment({
    roster: { engineerId: "eng-1" },
    activeClockIn: { areaType: "ceo_area" },
  });
  assert.equal(case4.assigned, true);
  assert.equal(case4.engineerId, "eng-1");
});

// 3. Ticket Verification Integrity Rule
test("Ticket Verification: Engineer CANNOT verify their own ticket", () => {
  function canVerifyTicket({ userRole, ticketAssignedEngineerId, currentUserId }) {
    if (userRole !== "spv" && userRole !== "manager") {
      return { allowed: false, reason: "Only SPV or Manager can verify" };
    }
    if (ticketAssignedEngineerId === currentUserId) {
      return { allowed: false, reason: "Engineer cannot verify own ticket" };
    }
    return { allowed: true };
  }

  // 1. Engineer trying to verify own ticket
  const res1 = canVerifyTicket({
    userRole: "engineer",
    ticketAssignedEngineerId: "user-eng-1",
    currentUserId: "user-eng-1",
  });
  assert.equal(res1.allowed, false);

  // 2. SPV who also happens to be the assigned engineer (dual role) -> rejected
  const res2 = canVerifyTicket({
    userRole: "spv",
    ticketAssignedEngineerId: "user-spv-1",
    currentUserId: "user-spv-1",
  });
  assert.equal(res2.allowed, false);
  assert.equal(res2.reason, "Engineer cannot verify own ticket");

  // 3. Different SPV verifying engineer's ticket -> allowed
  const res3 = canVerifyTicket({
    userRole: "spv",
    ticketAssignedEngineerId: "user-eng-1",
    currentUserId: "user-spv-1",
  });
  assert.equal(res3.allowed, true);
});

// 4. Shift Roster Anti-Bentrok Conflict Rule
test("Roster: Rejects assigning same engineer to duplicate/conflicting shifts on same date", () => {
  const existingRosters = [
    { shiftDate: "2026-11-08", shiftDefinitionId: "shift-1", engineerId: "eng-1" },
  ];

  function validateNewRoster(date, shiftDefId, engId) {
    const conflict = existingRosters.find(
      (r) => r.shiftDate === date && r.engineerId === engId && r.shiftDefinitionId !== shiftDefId
    );
    if (conflict) {
      return { valid: false, error: "Konflik roster shift pada tanggal yang sama" };
    }
    return { valid: true };
  }

  // Assigning eng-1 to shift-2 on same date -> rejected
  assert.equal(validateNewRoster("2026-11-08", "shift-2", "eng-1").valid, false);

  // Assigning eng-2 to shift-2 on same date -> allowed
  assert.equal(validateNewRoster("2026-11-08", "shift-2", "eng-2").valid, true);

  // Assigning eng-1 to shift-1 on NEXT date -> allowed
  assert.equal(validateNewRoster("2026-11-09", "shift-1", "eng-1").valid, true);
});
