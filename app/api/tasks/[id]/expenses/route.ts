import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id: taskId } = await params;

    // 1. SECURITY CHECK
    if (!agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { itemName, cost, category, description } = body;
    const expenseCost = parseFloat(cost) || 0;

    // 2. VERIFY TASK OWNERSHIP
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, agencyId: agencyId },
    });

    if (!existingTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    /**
     * 3. ATOMIC TRANSACTION
     * Formula: 
     * - realCost = (freelancer salary + previous expenses) + new expenseCost
     * - taskNetProfit = totalInvoice - realCost
     * - totalInvoice remains fixed (billed to client)
     */
    const [newExpense] = await prisma.$transaction(async (tx) => {
  // Create the expense
  const expense = await tx.taskExpense.create({
    data: {
      itemName,
      cost: expenseCost,
      category: category || "EQUIPMENT",
      description: description || "",
      taskId: taskId,
      projectId: existingTask.projectId,
      agencyId: agencyId,
    },
  });

  // Get current task values to recalculate correctly
  const currentTask = await tx.task.findUnique({
    where: { id: taskId },
    include: { taskExpenses: true },
  });

  if (!currentTask) throw new Error("Task not found in transaction");

  const internalCost = currentTask.internalCost || 0;
  const marginPercent = currentTask.margin || 0;
  const taskNetProfit = currentTask.taskNetProfit;
  

  // Sum ALL expenses including the new one
  const sumExpenses = currentTask.taskExpenses.reduce((sum, e) => sum + e.cost, 0) + expenseCost;

  // Recalculate invoice-side fields
  const marginAmount = currentTask.marginAmount;


  // realCost grows by the new expense
  // taskNetProfit = new totalInvoice - new realCost
  const newRealCost = (currentTask.realCost || 0) + expenseCost;
  const newTaskNetProfit = taskNetProfit - expenseCost;

  await tx.task.update({
    where: { id: taskId },
    data: {
      marginAmount,
      realCost: newRealCost,
      taskNetProfit: newTaskNetProfit,
    },
  });

  return [expense];
});
    return NextResponse.json(newExpense);
  } catch (error) {
    console.error("EXPENSE_CREATION_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id: taskId } = await params;

    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const { expenseId } = await req.json();

    await prisma.$transaction(async (tx) => {
      // 1. Get the expense to know its cost before deleting
      const expense = await tx.taskExpense.findFirst({
        where: { id: expenseId, taskId, agencyId },
      });

      if (!expense) throw new Error("Expense not found");

      const expenseCost = expense.cost;

      // 2. Delete it
      await tx.taskExpense.delete({ where: { id: expenseId } });

      // 3. Reverse the financial impact on the task
      const currentTask = await tx.task.findUnique({ where: { id: taskId } });
      if (!currentTask) throw new Error("Task not found");

      const newRealCost = (currentTask.realCost || 0) - expenseCost;
      const newTotalInvoice = (currentTask.totalInvoice || 0) - expenseCost;
      const newTaskNetProfit = (currentTask.taskNetProfit || 0) + expenseCost;

      await tx.task.update({
        where: { id: taskId },
        data: {
          realCost: newRealCost,
          totalInvoice: newTotalInvoice,
          taskNetProfit: newTaskNetProfit,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("EXPENSE_DELETE_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}