"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createInventoryItem(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const itemCode = (formData.get("itemCode") as string)?.toUpperCase().trim();
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const unitOfMeasure = formData.get("unitOfMeasure") as string;
  const initialQuantity = parseInt(formData.get("initialQuantity") as string, 10) || 0;
  const minimumQuantity = parseInt(formData.get("minimumQuantity") as string, 10) || 0;
  const storageLocation = formData.get("storageLocation") as string;

  if (!itemCode || !name || !category || !unitOfMeasure) {
    return;
  }

  const existing = await db.inventoryItem.findUnique({ where: { itemCode } });
  if (existing) {
    return;
  }

  await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        itemCode,
        name,
        category,
        unitOfMeasure,
        quantityOnHand: initialQuantity,
        minimumQuantity,
        storageLocation,
        isActive: true,
      },
    });

    if (initialQuantity > 0) {
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: item.id,
          transactionType: "OPENING_BALANCE",
          quantityDelta: initialQuantity,
          reason: "Saldo awal inventaris saat pembuatan master item",
          createdBy: user.id,
          idempotencyKey: `init-${item.id}-${Date.now()}`,
        },
      });
    }

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "INVENTORY_ITEM_CREATE",
      module: "inventory",
      entityType: "inventory_item",
      entityId: item.id,
      afterJson: { itemCode, name, initialQuantity, minimumQuantity },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function receiveStock(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const itemId = formData.get("itemId") as string;
  const quantity = parseInt(formData.get("quantity") as string, 10);
  const reason = (formData.get("reason") as string) || "Penerimaan barang masuk dari vendor/pembelian";

  if (!itemId || isNaN(quantity) || quantity <= 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return;

    const newQty = item.quantityOnHand + quantity;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: newQty },
    });

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        transactionType: "STOCK_IN",
        quantityDelta: quantity,
        reason,
        createdBy: user.id,
        idempotencyKey: `stockin-${item.id}-${Date.now()}`,
      },
    });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "INVENTORY_STOCK_IN",
      module: "inventory",
      entityType: "inventory_item",
      entityId: item.id,
      afterJson: {
        item: item.name,
        qtyAdded: quantity,
        newTotal: newQty,
        reason,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
}

export async function adjustStock(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const itemId = formData.get("itemId") as string;
  const newQuantity = parseInt(formData.get("newQuantity") as string, 10);
  const reason = formData.get("reason") as string;

  if (!itemId || isNaN(newQuantity) || newQuantity < 0 || !reason) {
    return;
  }

  await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return;

    const delta = newQuantity - item.quantityOnHand;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: newQuantity },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        transactionType: "ADJUSTMENT",
        quantityDelta: delta,
        reason,
        createdBy: user.id,
        approvedBy: user.id,
        idempotencyKey: `adjust-${item.id}-${Date.now()}`,
      },
    });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "INVENTORY_ADJUSTMENT",
      module: "inventory",
      entityType: "inventory_item",
      entityId: item.id,
      beforeJson: { quantityOnHand: item.quantityOnHand },
      afterJson: { newQuantity, delta, reason },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
}

export async function createStocktakeSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  // Fetch all active items to populate baseline snapshot lines
  const items = await db.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  await db.$transaction(async (tx) => {
    const session = await tx.stocktakeSession.create({
      data: {
        status: "DRAFT",
        startedBy: user.id,
      },
    });

    for (const it of items) {
      await tx.stocktakeLine.create({
        data: {
          stocktakeSessionId: session.id,
          inventoryItemId: it.id,
          systemQuantity: it.quantityOnHand,
          physicalQuantity: it.quantityOnHand, // Initial proposal equals system
          variance: 0,
        },
      });
    }

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "STOCKTAKE_SESSION_START",
      module: "inventory",
      entityType: "stocktake_session",
      entityId: session.id,
      afterJson: { itemCount: items.length },
    });
  });

  revalidatePath("/inventory/stocktake");
}

export async function updateStocktakeLine(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const lineId = formData.get("lineId") as string;
  const physicalQuantity = parseInt(formData.get("physicalQuantity") as string, 10);
  const note = (formData.get("note") as string) || null;

  if (!lineId || isNaN(physicalQuantity) || physicalQuantity < 0) {
    return;
  }

  const line = await db.stocktakeLine.findUnique({ where: { id: lineId } });
  if (!line) return;

  const variance = physicalQuantity - line.systemQuantity;

  await db.stocktakeLine.update({
    where: { id: lineId },
    data: {
      physicalQuantity,
      variance,
      note,
    },
  });

  revalidatePath("/inventory/stocktake");
}

export async function finalizeStocktakeSession(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roleCodes.includes("spv") && !user.roleCodes.includes("manager"))) {
    return;
  }

  const sessionId = formData.get("sessionId") as string;
  if (!sessionId) return;

  await db.$transaction(async (tx) => {
    const session = await tx.stocktakeSession.findUnique({
      where: { id: sessionId },
      include: {
        lines: {
          include: { item: true },
        },
      },
    });

    if (!session || session.status !== "DRAFT") return;

    for (const line of session.lines) {
      if (line.variance !== 0) {
        // Adjust stock in inventoryItem
        await tx.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { quantityOnHand: line.physicalQuantity },
        });

        // Record stock opname transaction
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: line.inventoryItemId,
            transactionType: "STOCK_OPNAME",
            quantityDelta: line.variance,
            referenceType: "stocktake",
            referenceId: session.id,
            reason: `Koreksi hasil stock opname sesi ${session.id}. Selisih: ${line.variance} ${line.item.unitOfMeasure}. Catatan: ${line.note || "—"}`,
            createdBy: user.id,
            approvedBy: user.id,
            idempotencyKey: `stocktake-${session.id}-${line.id}`,
          },
        });
      }
    }

    await tx.stocktakeSession.update({
      where: { id: session.id },
      data: {
        status: "APPROVED",
        approvedBy: user.id,
        completedAt: new Date(),
      },
    });

    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      action: "STOCKTAKE_SESSION_APPROVE",
      module: "inventory",
      entityType: "stocktake_session",
      entityId: session.id,
      afterJson: {
        appliedLinesCount: session.lines.length,
        variancesCount: session.lines.filter((l) => l.variance !== 0).length,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/stocktake");
  revalidatePath("/dashboard");
}
