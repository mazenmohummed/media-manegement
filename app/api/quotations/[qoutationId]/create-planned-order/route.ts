// app/api/quotations/[quotationId]/create-planned-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { ProcurementChainService } from "@/lib/services/procurement-chain.service";

export const POST = withAuthGuard("procurement:create", async (
  req: NextRequest,
  { agencyId, userId },
  context
) => {
  try {
    const params = await context.params;
    const quotationId = params.quotationId;
    const body = await req.json();
    const { vendorIds } = body;

    if (!quotationId) {
      return NextResponse.json(
        { error: "Quotation ID is required" },
        { status: 400 }
      );
    }

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json(
        { error: "At least one vendor is required" },
        { status: 400 }
      );
    }

    const result = await ProcurementChainService.createPlannedOrderFromQuotation(
      quotationId,
      vendorIds,
      { agencyId, userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Planned purchase order created successfully",
    });
  } catch (error: any) {
    console.error("[CREATE_PLANNED_ORDER_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create planned order" },
      { status: 500 }
    );
  }
});