// app/api/planned-purchase-orders/[orderId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { ProcurementChainService } from "@/lib/services/procurement-chain.service";

export const POST = withAuthGuard("procurement:approve", async (
  req: NextRequest,
  { agencyId, userId },
  context
) => {
  try {
    const params = await context.params;
    const orderId = params.orderId;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const result = await ProcurementChainService.approvePlannedOrder(
      orderId,
      { agencyId, userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Planned order approved successfully",
    });
  } catch (error: any) {
    console.error("[APPROVE_PLANNED_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve planned order" },
      { status: 500 }
    );
  }
});