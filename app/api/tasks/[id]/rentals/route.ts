import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * FINANCIAL CALCULATOR HELPER
 * Factors in the new expense to update the parent Task totals.
 */
const calculateTaskFinance = (
  internalCost: number,
  marginPercent: number,
  taskExpenses: { cost: number }[],
  userType: string
) => {
  const sumExpenses = taskExpenses.reduce((sum, e) => sum + e.cost, 0);
  
  // marginAmount = ((internalCost + expenses) * margin) / 100
  const marginAmount = ((internalCost + sumExpenses) * marginPercent) / 100;
  
  // totalValue = internalCost + expenses + marginAmount
  const totalValue = internalCost + sumExpenses + marginAmount;

  let taskNetProfit = 0;
  let realCost = 0;

  if (userType === "FULL_TIME" || userType === "PART_TIME") {
    // Staff: Profit = Revenue - external expenses. Cost = external expenses.
    taskNetProfit = totalValue - sumExpenses;
    realCost = sumExpenses;
  } else {
    // Freelancer: Profit = Strictly the margin. Cost = freelancer fee + expenses.
    taskNetProfit = marginAmount;
    realCost = sumExpenses + internalCost;
  }

  return { marginAmount, totalValue, taskNetProfit, realCost };
};

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

    // 2. VERIFY TASK OWNERSHIP & GET CONTEXT
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, agencyId: agencyId },
      include: { 
        assignees: { select: { userType: true } },
        taskExpenses: true 
      }
    });

    if (!existingTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // 3. CREATE THE EXPENSE
    const newExpense = await prisma.taskExpense.create({
      data: {
        itemName,
        cost: parseFloat(cost) || 0,
        category: category || "RENTAL",
        description: description || "",
        taskId: taskId,
        projectId: existingTask.projectId,
        agencyId: agencyId,
      }
    });

    // 4. RECALCULATE TASK FINANCES
    // We include the newly created expense in the list for calculation
    const updatedExpenses = [...existingTask.taskExpenses, newExpense];
    const primaryAssigneeType = existingTask.assignees[0]?.userType || "FREELANCER";

    const finances = calculateTaskFinance(
      existingTask.internalCost,
      existingTask.margin,
      updatedExpenses,
      primaryAssigneeType
    );

    // 5. ATOMIC UPDATE OF TASK TOTALS
    await prisma.task.update({
      where: { id: taskId },
      data: {
        marginAmount: finances.marginAmount,
        totalValue: finances.totalValue,
        taskNetProfit: finances.taskNetProfit,
        realCost: finances.realCost
      }
    });

    return NextResponse.json(newExpense);
  } catch (error) {
    console.error("RENTAL_CREATION_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}