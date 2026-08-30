// app/api/purchase-orders/[poId]/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { PurchaseOrderService } from "@/lib/services/purchase-order.service";

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Validates a single purchase order item
 */
function validateItem(item: any, isPartial: boolean = false): string | null {
  if (!isPartial && !item.description) {
    return "Item description is required";
  }
  
  if (item.description !== undefined && !item.description) {
    return "Item description cannot be empty";
  }

  if (item.quantity !== undefined) {
    if (item.quantity <= 0) {
      return "Quantity must be greater than 0";
    }
    if (!Number.isInteger(item.quantity)) {
      return "Quantity must be a whole number";
    }
  }

  if (item.unitCost !== undefined && item.unitCost < 0) {
    return "Unit cost must be greater than or equal to 0";
  }

  return null;
}

/**
 * Validates an array of items for bulk operations
 */
function validateItems(items: any[]): { valid: boolean; error?: string } {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "Items array is required and must not be empty" };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const error = validateItem(item);
    if (error) {
      return { valid: false, error: `Item ${i + 1}: ${error}` };
    }
  }

  return { valid: true };
}

// ─── GET /api/purchase-orders/[poId]/items ───────────────────────────────────
// Get all items for a purchase order
export const GET = withAuthGuard("purchase:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;

    const db = getScopedPrisma(agencyId);

    const items = await db.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId: poId,
      },
      orderBy: { createdAt: "asc" },
    });

    // Get PO details for context
    const po = await db.purchaseOrder.findFirst({
      where: { id: poId },
      select: {
        id: true,
        poNo: true,
        status: true,
        totalAmount: true,
        currency: true,
        vendorId: true,
        agencyId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        purchaseOrder: po,
        count: items.length,
      },
    });
  } catch (error: any) {
    console.error("[GET_PO_ITEMS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch items" },
      { status: 500 }
    );
  }
});

// ─── POST /api/purchase-orders/[poId]/items ──────────────────────────────────
// Add a single item to a purchase order
export const POST = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();

    // Validate
    const validationError = validateItem(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.addItem(poId, body);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Item added successfully",
    });
  } catch (error: any) {
    console.error("[ADD_PO_ITEM_ERROR]:", error);
    
    if (error.message === "Purchase order not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add item" },
      { status: 500 }
    );
  }
});

// ─── POST /api/purchase-orders/[poId]/items/bulk ─────────────────────────────
// Bulk add items to a purchase order
export const POST_BULK = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();
    const { items } = body;

    // Validate items
    const validation = validateItems(items);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.addItems(poId, items);

    return NextResponse.json({
      success: true,
      data: result,
      message: `${items.length} items added successfully`,
    });
  } catch (error: any) {
    console.error("[BULK_ADD_PO_ITEMS_ERROR]:", error);
    
    if (error.message === "Purchase order not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add items" },
      { status: 500 }
    );
  }
});

// ─── PUT /api/purchase-orders/[poId]/items/[itemId] ──────────────────────────
// Update an existing item
export const PUT = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const itemId = params.itemId;
    const body = await req.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Validate fields (partial update allowed)
    const validationError = validateItem(body, true);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.updateItem(itemId, body);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Item updated successfully",
    });
  } catch (error: any) {
    console.error("[UPDATE_PO_ITEM_ERROR]:", error);
    
    if (error.message === "Item not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update item" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/purchase-orders/[poId]/items/[itemId] ──────────────────────
// Delete an item from a purchase order
export const DELETE = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const itemId = params.itemId;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.deleteItem(itemId);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Item deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE_PO_ITEM_ERROR]:", error);
    
    if (error.message === "Item not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete item" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/purchase-orders/[poId]/items/reorder ─────────────────────────
// Reorder items (change display order)
export const PATCH_REORDER = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "Item IDs array is required" },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.reorderItems(poId, itemIds);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Items reordered successfully",
    });
  } catch (error: any) {
    console.error("[REORDER_PO_ITEMS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reorder items" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/purchase-orders/[poId]/items/bulk ───────────────────────────
// Bulk delete items from a purchase order
export const DELETE_BULK = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "Item IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    const result = await PurchaseOrderService.deleteItems(poId, itemIds);

    return NextResponse.json({
      success: true,
      data: result,
      message: `${itemIds.length} items deleted successfully`,
    });
  } catch (error: any) {
    console.error("[BULK_DELETE_PO_ITEMS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete items" },
      { status: 500 }
    );
  }
});

// ─── PUT /api/purchase-orders/[poId]/items/bulk-update ──────────────────────
// Bulk update multiple items
export const PUT_BULK_UPDATE = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id) {
        return NextResponse.json(
          { error: `Item ${i + 1}: ID is required` },
          { status: 400 }
        );
      }
      const validationError = validateItem(item, true);
      if (validationError) {
        return NextResponse.json(
          { error: `Item ${i + 1}: ${validationError}` },
          { status: 400 }
        );
      }
    }

    const result = await PurchaseOrderService.bulkUpdateItems(poId, items);

    return NextResponse.json({
      success: true,
      data: result,
      message: `${items.length} items updated successfully`,
    });
  } catch (error: any) {
    console.error("[BULK_UPDATE_PO_ITEMS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update items" },
      { status: 500 }
    );
  }
});