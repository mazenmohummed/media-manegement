// app/api/tasks/[taskId]/planned-expenses/[expenseId]/convert-to-quotation/route.ts
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
    const expenseId = params.expenseId;

    if (!expenseId) {
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const result = await ProcurementChainService.convertPlannedExpenseToQuotation(
      expenseId,
      { agencyId, userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Successfully converted to quotation",
    });
  } catch (error: any) {
    console.error("[CONVERT_TO_QUOTATION_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert to quotation" },
      { status: 500 }
    );
  }
});