// app/api/planned-purchase-orders/[orderId]/convert-to-po/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { ProcurementChainService } from "@/lib/services/procurement-chain.service";

export const POST = withAuthGuard("procurement:convert", async (
  req: NextRequest,
  { agencyId, userId },
  context
) => {
  try {
    const params = await context.params;
    const orderId = params["planned-purchase-ordersId"];

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const result = await ProcurementChainService.convertPlannedOrderToPurchaseOrder(
      orderId,
      { agencyId, userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Purchase order created successfully",
    });
  } catch (error: any) {
    console.error("[CONVERT_TO_PO_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert to purchase order" },
      { status: 500 }
    );
  }
});