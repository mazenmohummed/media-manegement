// app/api/purchase-orders/[poId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { PurchaseOrderService } from "@/lib/services/purchase-order.service";
import { PurchaseOrderStatus } from "@prisma/client";

// ─── GET /api/purchase-orders/[poId] ────────────────────────────────────────
export const GET = withAuthGuard("purchase:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;

    const db = getScopedPrisma(agencyId);

    const purchaseOrder = await db.purchaseOrder.findFirst({
      where: {
        id: poId,
        agencyId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            taxNumber: true,
            address: {
              select: {
                line1: true,
                line2: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectName: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNo: true,
            amount: true,
            status: true,
          },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      purchaseOrder,
    });
  } catch (error: any) {
    console.error("[GET_PURCHASE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/purchase-orders/[poId] ──────────────────────────────────────
// app/api/purchase-orders/[poId]/route.ts (updated PATCH section)
export const PATCH = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId, userId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();

    const db = getScopedPrisma(agencyId);

    // ── Verify PO exists and get current status ─────────────────────────────
    const existingPO = await db.purchaseOrder.findFirst({
      where: { id: poId, agencyId },
      include: {
        items: true,
      },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const {
      status,
      expectedDeliveryDate,
      notes,
      currency,
      items,
      vendorId,
      projectId,
    } = body;

    const updateData: any = {};
    const oldStatus = existingPO.status;
    const newStatus = status || existingPO.status;

    // ── Update basic fields ──────────────────────────────────────────────────
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (currency !== undefined) updateData.currency = currency;
    
    if (vendorId !== undefined) {
      if (vendorId) {
        const vendor = await db.vendor.findFirst({
          where: { id: vendorId, agencyId },
        });
        if (!vendor) {
          return NextResponse.json(
            { error: "Vendor not found" },
            { status: 404 }
          );
        }
        updateData.vendorId = vendorId;
      } else {
        updateData.vendorId = null;
      }
    }

    if (projectId !== undefined) {
      if (projectId) {
        const project = await db.project.findFirst({
          where: { id: projectId, agencyId },
        });
        if (!project) {
          return NextResponse.json(
            { error: "Project not found" },
            { status: 404 }
          );
        }
        updateData.projectId = projectId;
      } else {
        updateData.projectId = null;
      }
    }

    if (expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }

    // ── Handle items update ──────────────────────────────────────────────────
    let updatedTotalAmount: number | undefined;

    if (items && Array.isArray(items)) {
      const parsedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        const total = qty * cost;
        return {
          description: item.description || "Item",
          quantity: qty,
          unitCost: cost,
          total: total,
        };
      });

      updatedTotalAmount = parsedItems.reduce((acc, item) => acc + item.total, 0);

      await db.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: poId },
        });

        await tx.purchaseOrderItem.createMany({
          data: parsedItems.map((item) => ({
            ...item,
            purchaseOrderId: poId,
          })),
        });
      });

      updateData.totalAmount = updatedTotalAmount;
    }

    // ── Update the purchase order ──────────────────────────────────────────
    const updatedPO = await db.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    // ── ✅ TRIGGER: Handle status change and other triggers ──────────────
    const { PurchaseOrderTriggers } = await import("@/lib/triggers/purchase-order.triggers");
    
    await PurchaseOrderTriggers.handleTrigger(
      poId,
      "UPDATE",
      {
        agencyId,
        userId,
        triggerType: "UPDATE",
        previousState: existingPO,
        currentState: updatedPO,
      },
      {
        oldStatus: oldStatus as PurchaseOrderStatus,
        newStatus: newStatus as PurchaseOrderStatus,
      }
    );

    // ── Recalculate totals after update ────────────────────────────────────
    const { PurchaseOrderService } = await import("@/lib/services/purchase-order.service");
    await PurchaseOrderService.recalculateTotals(poId);

    return NextResponse.json({
      success: true,
      purchaseOrder: updatedPO,
      message: "Purchase order updated successfully",
    });
  } catch (error: any) {
    console.error("[UPDATE_PURCHASE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update purchase order" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/purchase-orders/[poId] ──────────────────────────────────────
export const DELETE = withAuthGuard("purchase:delete", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;

    const db = getScopedPrisma(agencyId);

    const existingPO = await db.purchaseOrder.findFirst({
      where: { id: poId, agencyId },
      include: {
        items: true,
      },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // ── Only allow deletion of DRAFT orders ─────────────────────────────────
    if (existingPO.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft purchase orders can be deleted" },
        { status: 400 }
      );
    }

    // ── Delete items first ───────────────────────────────────────────────────
    await db.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: poId },
    });

    // ── Delete PO ────────────────────────────────────────────────────────────
    await db.purchaseOrder.delete({
      where: { id: poId },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE_PURCHASE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete purchase order" },
      { status: 500 }
    );
  }
});

// ─── PUT /api/purchase-orders/[poId] ──────────────────────────────────────────
// Full update of a purchase order (all fields)
export const PUT = withAuthGuard("purchase:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;
    const body = await req.json();

    const db = getScopedPrisma(agencyId);

    const existingPO = await db.purchaseOrder.findFirst({
      where: { id: poId, agencyId },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const {
      vendorId,
      projectId,
      quotationId,
      currency,
      expectedDeliveryDate,
      notes,
      status,
      items,
    } = body;

    // ── Validate vendor ──────────────────────────────────────────────────────
    if (vendorId) {
      const vendor = await db.vendor.findFirst({
        where: { id: vendorId, agencyId },
      });
      if (!vendor) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 }
        );
      }
    }

    // ── Process items ────────────────────────────────────────────────────────
    let totalAmount = existingPO.totalAmount;
    let itemsOperation: any = undefined;

    if (items && Array.isArray(items)) {
      const parsedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        const total = qty * cost;
        return {
          description: item.description || "Item",
          quantity: qty,
          unitCost: cost,
          total,
        };
      });

      totalAmount = parsedItems.reduce((acc, item) => acc + item.total, 0);

      itemsOperation = {
        deleteMany: {},
        create: parsedItems,
      };
    }

    // ── Build update data ──────────────────────────────────────────────────
    const updateData: any = {
      ...(vendorId !== undefined && { vendorId: vendorId || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(quotationId !== undefined && { quotationId: quotationId || null }),
      ...(currency !== undefined && { currency }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
      ...(expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      }),
      ...(itemsOperation && { items: itemsOperation }),
      totalAmount,
    };

    // ── Handle status-specific fields ──────────────────────────────────────
    if (status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }
    if (status === "CANCELLED") {
      updateData.deliveredAt = null;
    }

    // ── Update the purchase order ──────────────────────────────────────────
    const updatedPO = await db.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    // ── Sync with linked quotation ──────────────────────────────────────────
    if (updatedPO.quotationId) {
      await db.quotation.update({
        where: { id: updatedPO.quotationId },
        data: {
          amount: totalAmount,
          currency: currency || updatedPO.currency,
        },
      });
    }

    return NextResponse.json({
      success: true,
      purchaseOrder: updatedPO,
      message: "Purchase order updated successfully",
    });
  } catch (error: any) {
    console.error("[PUT_PURCHASE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update purchase order" },
      { status: 500 }
    );
  }
});