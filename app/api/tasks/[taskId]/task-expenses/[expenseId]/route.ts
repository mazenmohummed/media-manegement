import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PATCH: Update an existing task expense
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string; expenseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, expenseId } = await params;
    const body = await req.json();
    const { itemName, cost, category, description, reimbursable, status } = body;

    const existing = await prisma.taskExpense.findUnique({
      where: { id: expenseId },
    });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const taskExpense = await prisma.taskExpense.update({
      where: { id: expenseId },
      data: {
        ...(itemName !== undefined && { itemName }),
        ...(cost !== undefined && { cost: parseFloat(cost) || 0 }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(reimbursable !== undefined && { reimbursable: Boolean(reimbursable) }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ taskExpense }, { status: 200 });
  } catch (error) {
    console.error("Failed to update task expense:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove a specific task expense
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string; expenseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, expenseId } = await params;

    const existing = await prisma.taskExpense.findUnique({
      where: { id: expenseId },
    });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.taskExpense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete task expense:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}