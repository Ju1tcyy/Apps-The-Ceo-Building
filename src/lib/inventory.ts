import { db } from "./db";
import { logAudit } from "./audit";

export interface ConsumableItemUsage {
  inventoryItemId: string;
  quantityUsed: number;
}

export interface RecordConsumptionParams {
  ticketId: string;
  consumables: ConsumableItemUsage[];
  recordedByUserId: string;
  userRole: string;
  idempotencyKey: string;
}

/**
 * Atomic & Idempotent Consumable Deduction for Completed Tickets.
 * Strictly prevents negative stock as confirmed by business decision.
 */
export async function recordTicketConsumption({
  ticketId,
  consumables,
  recordedByUserId,
  userRole,
  idempotencyKey,
}: RecordConsumptionParams) {
  if (!consumables || consumables.length === 0) {
    return { success: true, count: 0 };
  }

  return await db.$transaction(async (tx) => {
    // 1. Check idempotency: if this key was already processed, return immediately
    const existingTx = await tx.inventoryTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      return { success: true, count: 0, idempotentDuplicate: true };
    }

    const deductedItems: Array<{ name: string; qty: number; remaining: number }> = [];

    for (const itemUsage of consumables) {
      if (itemUsage.quantityUsed <= 0) continue;

      const item = await tx.inventoryItem.findUnique({
        where: { id: itemUsage.inventoryItemId },
      });

      if (!item) {
        throw new Error(`Item inventaris ID '${itemUsage.inventoryItemId}' tidak ditemukan.`);
      }

      // Negative stock rejection policy
      if (item.quantityOnHand < itemUsage.quantityUsed) {
        throw new Error(
          `Stok tidak mencukupi untuk '${item.name}' (Tersedia: ${item.quantityOnHand} ${item.unitOfMeasure}, Dibutuhkan: ${itemUsage.quantityUsed}). Transaksi konsumsi ditolak sesuai kebijakan anti-stok negatif.`
        );
      }

      const newQty = item.quantityOnHand - itemUsage.quantityUsed;

      // Update quantity on hand
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityOnHand: newQty },
      });

      // Record transaction
      const itemTxKey = `${idempotencyKey}-${item.id}`;
      const invTx = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: item.id,
          transactionType: "CONSUMPTION",
          quantityDelta: -itemUsage.quantityUsed,
          referenceType: "ticket",
          referenceId: ticketId,
          reason: `Penggunaan material untuk tiket pekerjaan ${ticketId}`,
          createdBy: recordedByUserId,
          idempotencyKey: itemTxKey,
        },
      });

      // Record consumable link
      await tx.ticketConsumable.create({
        data: {
          ticketId,
          inventoryItemId: item.id,
          quantityUsed: itemUsage.quantityUsed,
          inventoryTransactionId: invTx.id,
          recordedBy: recordedByUserId,
        },
      });

      deductedItems.push({
        name: item.name,
        qty: itemUsage.quantityUsed,
        remaining: newQty,
      });
    }

    // Record audit log
    await logAudit({
      actorUserId: recordedByUserId,
      actorRole: userRole,
      action: "INVENTORY_CONSUMPTION",
      module: "inventory",
      entityType: "ticket",
      entityId: ticketId,
      afterJson: { items: deductedItems, idempotencyKey },
      source: "human",
    });

    return { success: true, count: deductedItems.length, deductedItems };
  });
}
