// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { PurchaseOrderService } from "@/lib/services/purchase-order.service";
import { PurchaseOrderStatus } from "@prisma/client";

// Helper function to generate a sequential purchase order number per agency
async function generatePoNo(tx: any, agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const lastPo = await tx.purchaseOrder.findFirst({
    where: { agencyId, poNo: { startsWith: prefix } },
    orderBy: { poNo: 'desc' },
    select: { poNo: true },
  });

  let nextSeq = 1;
  if (lastPo?.poNo) {
    const lastSeq = parseInt(lastPo.poNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// ─── GET /api/purchase-orders ──────────────────────────────────────────────
export const GET = withAuthGuard("purchase:read", async (req: NextRequest, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    
    const status = searchParams.get("status") as PurchaseOrderStatus | null;
    const vendorId = searchParams.get("vendorId");
    const projectId = searchParams.get("projectId");
    const q = searchParams.get("q");

    const whereClause: any = {
      agencyId: agencyId,
    };

    if (status) whereClause.status = status;
    if (vendorId) whereClause.vendorId = vendorId;
    if (projectId) whereClause.projectId = projectId;
    
    if (q) {
      whereClause.OR = [
        { poNo: { contains: q, mode: "insensitive" } },
        { vendor: { name: { contains: q, mode: "insensitive" } } },
        { project: { name: { contains: q, mode: "insensitive" } } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const purchaseOrders = await db.purchaseOrder.findMany({
      where: whereClause,
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
        quotation: {
          select: {
            id: true,
            quotationNo: true,
          },
        },
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitCost: true,
            total: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get stats
    const stats = await db.purchaseOrder.groupBy({
      by: ["status"],
      where: { agencyId },
      _count: true,
    });

    const statusStats = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      purchaseOrders,
      stats: {
        total: purchaseOrders.length,
        byStatus: statusStats,
      },
    });
  } catch (error: any) {
    console.error("[GET_PURCHASE_ORDERS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
});

// ─── POST /api/purchase-orders ─────────────────────────────────────────────
// app/api/purchase-orders/route.ts (updated POST section)
export const POST = withAuthGuard("purchase:create", async (req: NextRequest, { agencyId, userId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const body = await req.json();
    
    const {
      vendorId,
      projectId,
      quotationId,
      currency,
      expectedDeliveryDate,
      notes,
      items,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const vendor = await db.vendor.findFirst({
      where: { id: vendorId, agencyId },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // ── Process items ──────────────────────────────────────────────────────
    let calculatedTotal = 0;
    const processedItems = items.map((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const total = quantity * unitCost;
      calculatedTotal += total;
      return {
        description: item.description || "Item",
        quantity,
        unitCost,
        total,
      };
    });

    // ── Create purchase order in transaction ──────────────────────────────
    const purchaseOrder = await db.$transaction(async (tx) => {
      const poNo = await generatePoNo(tx, agencyId);

      const createdOrder = await tx.purchaseOrder.create({
        data: {
          poNo,
          vendorId,
          projectId: projectId || null,
          quotationId: quotationId || null,
          agencyId,
          currency: currency || "EGP",
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes: notes || null,
          status: "DRAFT",
          totalAmount: calculatedTotal,
          items: {
            create: processedItems,
          },
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
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

      if (quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: quotationId },
          select: { amount: true },
        });

        const currentAmount = quotation?.amount ?? 0;

        await tx.quotation.update({
          where: { id: quotationId },
          data: { amount: currentAmount + calculatedTotal },
        });
      }

      return createdOrder;
    });

    // ── ✅ TRIGGER: Handle create triggers ──────────────────────────────
    const { PurchaseOrderTriggers } = await import("@/lib/triggers/purchase-order.triggers");
    
    await PurchaseOrderTriggers.handleTrigger(
      purchaseOrder.id,
      "CREATE",
      {
        agencyId,
        userId,
        triggerType: "CREATE",
        currentState: purchaseOrder,
      }
    );

    // ── Create notification ──────────────────────────────────────────────────
    await db.notification.create({
      data: {
        userId: userId,
        agencyId,
        title: "Purchase Order Created",
        message: `Purchase Order ${purchaseOrder.poNo} has been created for ${vendor.name}`,
        type: "SYSTEM",
        actionUrl: `/dashboard/vendors/purchase-orders/${purchaseOrder.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      purchaseOrder,
      message: "Purchase order created successfully",
    }, { status: 201 });
  } catch (error: any) {
    console.error("[CREATE_PURCHASE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create purchase order" },
      { status: 500 }
    );
  }
});