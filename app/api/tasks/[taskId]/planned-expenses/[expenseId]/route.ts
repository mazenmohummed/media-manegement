import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalculateTaskExpenseTotals } from "@/lib/actions/expenses";
import { PlannedExpenseStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string; expenseId: string }> }
) {
  try {
    const { taskId, expenseId } = await params;
    const body = await req.json();
    const { itemName, category, quantity, unitCost, taxRate, description, status, vendorId, approvedCost } = body;

    const existing = await db.taskPlannedExpense.findUnique({
      where: { id: expenseId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense item not found" }, { status: 404 });
    }

    const qty = quantity !== undefined ? Number(quantity) : existing.quantity;
    const cost = unitCost !== undefined ? Number(unitCost) : existing.unitCost;
    const tax = taxRate !== undefined ? Number(taxRate) : existing.taxRate;
    
    const totalEstimated = qty * cost * (1 + tax / 100);

    // Handle approved cost logic
    let finalApprovedCost = existing.approvedCost;
    if (approvedCost !== undefined) {
      finalApprovedCost = approvedCost !== null ? Number(approvedCost) : null;
    } else if (status === "APPROVED" && existing.approvedCost === null) {
      finalApprovedCost = totalEstimated;
    }

    // Build dynamic update data object safely without undefined values
    const updateData: any = {
      quantity: qty,
      unitCost: cost,
      taxRate: tax,
      totalEstimated,
      estimatedCost: totalEstimated,
      approvedCost: finalApprovedCost,
    };

    if (itemName !== undefined) updateData.itemName = itemName.trim();
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    
    if (status !== undefined) {
      const validStatuses = Object.values(PlannedExpenseStatus);
      if (validStatuses.includes(status)) {
        updateData.status = status as PlannedExpenseStatus;
      } else {
        return NextResponse.json({ error: `Invalid status value provided: ${status}. Allowed values are: ${validStatuses.join(", ")}` }, { status: 400 });
      }
    }

    if (vendorId !== undefined) updateData.vendorId = vendorId;

    const updated = await db.taskPlannedExpense.update({
      where: { id: expenseId },
      data: updateData,
    });

    await recalculateTaskExpenseTotals(taskId);

    return NextResponse.json({ plannedExpense: updated });
  } catch (error) {
    console.error("Failed to update planned expense:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}