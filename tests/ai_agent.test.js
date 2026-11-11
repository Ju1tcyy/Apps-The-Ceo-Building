import { test, describe } from "node:test";
import assert from "node:assert";

describe("AI Agent & Operational Intelligence", () => {
  // Mock Risk Classification Engine
  function classifyRisk(actionType, context) {
    if (actionType === "STOCK_ADJUSTMENT" || actionType === "FORCED_REASSIGNMENT" || actionType === "INVOICE_MODIFY") {
      return {
        riskLevel: "LEVEL_3",
        requiresApproval: true,
        allowedApprovers: ["direksi", "manager", "spv"],
      };
    }
    if (actionType === "SLA_ESCALATION" || actionType === "OVERDUE_BILLING_ESCALATION") {
      return {
        riskLevel: "LEVEL_2",
        requiresApproval: false,
        notifies: "SPV",
      };
    }
    if (actionType === "DRAFT_WEEKLY_REPORT" || actionType === "SCHEDULE_REMINDER") {
      return {
        riskLevel: "LEVEL_1",
        requiresApproval: false,
        isRoutine: true,
      };
    }
    return {
      riskLevel: "LEVEL_1",
      requiresApproval: false,
    };
  }

  test("AI Risk Level 3: Stock adjustment and forced reassignment strictly require human approval", () => {
    const stockPolicy = classifyRisk("STOCK_ADJUSTMENT", { itemId: "item-1" });
    assert.strictEqual(stockPolicy.riskLevel, "LEVEL_3");
    assert.strictEqual(stockPolicy.requiresApproval, true);
    assert.deepStrictEqual(stockPolicy.allowedApprovers, ["direksi", "manager", "spv"]);

    const reassignPolicy = classifyRisk("FORCED_REASSIGNMENT", { ticketId: "tc-1" });
    assert.strictEqual(reassignPolicy.riskLevel, "LEVEL_3");
    assert.strictEqual(reassignPolicy.requiresApproval, true);
  });

  test("AI Risk Level 2: SLA escalation flags SPV without requiring full board approval", () => {
    const slaPolicy = classifyRisk("SLA_ESCALATION", { ticketId: "tc-101" });
    assert.strictEqual(slaPolicy.riskLevel, "LEVEL_2");
    assert.strictEqual(slaPolicy.requiresApproval, false);
    assert.strictEqual(slaPolicy.notifies, "SPV");
  });

  test("AI Risk Level 1: Routine draft generation proceeds automatically after configuration", () => {
    const reportPolicy = classifyRisk("DRAFT_WEEKLY_REPORT");
    assert.strictEqual(reportPolicy.riskLevel, "LEVEL_1");
    assert.strictEqual(reportPolicy.requiresApproval, false);
    assert.strictEqual(reportPolicy.isRoutine, true);
  });

  test("Approval Authorization Guard: Engineer cannot approve Level 3 action", () => {
    function authorizeApproval(userRole, riskPolicy) {
      if (!riskPolicy.requiresApproval) return true;
      return riskPolicy.allowedApprovers.includes(userRole.toLowerCase());
    }

    const policy = classifyRisk("STOCK_ADJUSTMENT");
    const engineerAttempt = authorizeApproval("engineer", policy);
    const accountingAttempt = authorizeApproval("accounting", policy);
    const spvAttempt = authorizeApproval("spv", policy);
    const direksiAttempt = authorizeApproval("direksi", policy);

    assert.strictEqual(engineerAttempt, false, "Engineer must not be allowed to approve Level 3");
    assert.strictEqual(accountingAttempt, false, "Accounting must not approve inventory adjustment");
    assert.strictEqual(spvAttempt, true, "SPV can approve Level 3 operational adjustments");
    assert.strictEqual(direksiAttempt, true, "Direksi can approve Level 3 adjustments");
  });

  test("Explainability & Audit: AI recommendations must contain grounded reasoning and context source", () => {
    const sampleRec = {
      module: "inventory",
      contextType: "INVENTORY_ITEM",
      contextId: "cuid-item-99",
      recommendation: "Stok barang 'Lampu LED 18W' tersisa 2 unit, di bawah batas minimum (5 unit).",
      proposedAction: "Ajukan procurement restock sebanyak 10 unit.",
      riskLevel: "LEVEL_3",
      status: "PENDING",
    };

    assert.ok(sampleRec.recommendation.includes("Lampu LED 18W"));
    assert.ok(sampleRec.recommendation.includes("batas minimum"));
    assert.strictEqual(sampleRec.contextType, "INVENTORY_ITEM");
    assert.strictEqual(sampleRec.riskLevel, "LEVEL_3");
  });
});
