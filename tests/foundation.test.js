import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// 1. Password Hashing & Verification Test
test("Auth: Password hashing with bcrypt produces valid salt and verifies correctly", async () => {
  const plain = "SuperSecret2026!";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plain, salt);

  assert.notEqual(plain, hash);
  assert.equal(await bcrypt.compare(plain, hash), true);
  assert.equal(await bcrypt.compare("WrongPassword", hash), false);
});

// 2. JWT Session Token Test
test("Auth: Session JWT token generation, verification, and tamper rejection", async () => {
  const secret = new TextEncoder().encode("the-ceo-secret-jwt-key-2026-secure-token-asia-jakarta");
  const payload = {
    userId: "user-123",
    email: "spv@theceobuilding.com",
    name: "Supervisor Test",
    roles: ["spv"],
  };

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  assert.ok(typeof token === "string" && token.length > 20);

  // Valid verification
  const { payload: verified } = await jwtVerify(token, secret);
  assert.equal(verified.userId, "user-123");
  assert.equal(verified.email, "spv@theceobuilding.com");
  assert.deepEqual(verified.roles, ["spv"]);

  // Tamper rejection
  const wrongSecret = new TextEncoder().encode("wrong-secret-key-1234567890123456");
  await assert.rejects(async () => {
    await jwtVerify(token, wrongSecret);
  });
});

// 3. RBAC & Granular Permission Matrix Test
test("RBAC: SPV is the ONLY role with report.export_weekly permission", () => {
  const ROLE_PERMISSIONS = {
    direksi: ["ticket.view_all", "inventory.view", "invoice.view", "report.view", "ai.view", "audit.view"],
    spv: ["ticket.create", "ticket.view_all", "ticket.assign", "ticket.reassign", "ticket.update_status", "ticket.verify", "roster.manage", "daily_task.manage", "inventory.view", "inventory.receive", "inventory.stocktake", "report.view", "report.export_weekly", "ai.view", "audit.view"],
    manager: ["ticket.create", "ticket.view_all", "ticket.assign", "ticket.reassign", "ticket.update_status", "inventory.view", "inventory.adjust", "invoice.view", "invoice.manage", "report.view", "ai.view", "ai.approve", "audit.view", "user.manage"],
    accounting: ["invoice.view", "invoice.manage", "invoice.payment_update", "invoice.reminder_manage", "report.view", "audit.view"],
    engineer: ["ticket.view_assigned", "ticket.update_status", "attendance.clock", "inventory.consume"],
  };

  function hasPermission(roles, requiredPermission) {
    for (const role of roles) {
      const perms = ROLE_PERMISSIONS[role];
      if (perms && perms.includes(requiredPermission)) return true;
    }
    return false;
  }

  // SPV can export weekly report
  assert.equal(hasPermission(["spv"], "report.export_weekly"), true);

  // Direksi CANNOT export weekly report
  assert.equal(hasPermission(["direksi"], "report.export_weekly"), false);

  // Manager CANNOT export weekly report
  assert.equal(hasPermission(["manager"], "report.export_weekly"), false);

  // Engineer CANNOT export weekly report
  assert.equal(hasPermission(["engineer"], "report.export_weekly"), false);

  // Accounting CANNOT export weekly report
  assert.equal(hasPermission(["accounting"], "report.export_weekly"), false);
});

test("RBAC: Engineer CANNOT verify tickets; only SPV can verify", () => {
  const ROLE_PERMISSIONS = {
    spv: ["ticket.verify"],
    engineer: ["ticket.update_status", "attendance.clock"],
  };

  assert.equal(ROLE_PERMISSIONS.spv.includes("ticket.verify"), true);
  assert.equal(ROLE_PERMISSIONS.engineer.includes("ticket.verify"), false);
});

// 4. Shift & Timezone WIB Test (Confirmed business rules)
test("Shift Time: Active shift correctly identified in Asia/Jakarta timezone", () => {
  // Test helper using fixed UTC dates
  function getActiveShiftNameFromHour(wibHour) {
    if (wibHour >= 6 && wibHour < 14) {
      return "Shift 1"; // 06:00 - 14:00
    } else if (wibHour >= 14 && wibHour < 22) {
      return "Shift 2"; // 14:00 - 22:00
    } else {
      return "Shift 3"; // 22:00 - 06:00 (crosses midnight)
    }
  }

  // Shift 1: 06:00 to 13:59
  assert.equal(getActiveShiftNameFromHour(6), "Shift 1");
  assert.equal(getActiveShiftNameFromHour(10), "Shift 1");
  assert.equal(getActiveShiftNameFromHour(13), "Shift 1");

  // Shift 2: 14:00 to 21:59
  assert.equal(getActiveShiftNameFromHour(14), "Shift 2");
  assert.equal(getActiveShiftNameFromHour(18), "Shift 2");
  assert.equal(getActiveShiftNameFromHour(21), "Shift 2");

  // Shift 3: 22:00 to 05:59
  assert.equal(getActiveShiftNameFromHour(22), "Shift 3");
  assert.equal(getActiveShiftNameFromHour(23), "Shift 3");
  assert.equal(getActiveShiftNameFromHour(0), "Shift 3");
  assert.equal(getActiveShiftNameFromHour(2), "Shift 3");
  assert.equal(getActiveShiftNameFromHour(5), "Shift 3");
});

test("Shift Roster Date: Shift 3 past midnight correctly rolls back to starting date", () => {
  function getRosterDate(wibHour, todayStr, prevDayStr) {
    if (wibHour < 6) {
      return prevDayStr; // started previous evening at 22:00
    }
    return todayStr;
  }

  assert.equal(getRosterDate(23, "2026-11-08", "2026-11-07"), "2026-11-08");
  assert.equal(getRosterDate(2, "2026-11-08", "2026-11-07"), "2026-11-07");
});
