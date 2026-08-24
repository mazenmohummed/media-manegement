import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { recalculateTaskExpenseTotals } from "@/lib/actions/expenses";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    // 1. Recalculate first to ensure data integrity
    await recalculateTaskExpenseTotals(taskId);

    // 2. Fetch task and expenses
    const task = await db.task.findUnique({
      where: { id: taskId, agencyId: session.user.agencyId },
      include: {
        plannedExpenses: {
          include: { vendor: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        plannedRevenue: task.plannedRevenue,
        plannedExpenseTotal: task.plannedExpenseTotal,
        approvedBudget: task.approvedBudget,
        budgetVariance: task.budgetVariance,
      },
      plannedExpenses: task.plannedExpenses,
    });
  } catch (err: any) {
    console.error("Fetch task budget error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const body = await req.json();
    const { itemName, estimatedCost, quantity, unitCost, category, currency, taxRate, description, vendorId } = body;

    if (!itemName) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const qty = quantity ?? 1.0;
    const uCost = unitCost ?? estimatedCost ?? 0.0;
    const totalEstimated = qty * uCost;

    // Find task to retrieve projectId
    const task = await db.task.findUnique({
      where: { id: taskId, agencyId: session.user.agencyId },
      select: { projectId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create planned expense item
    const newExpense = await db.taskPlannedExpense.create({
      data: {
        itemName,
        estimatedCost: uCost,
        unitCost: uCost,
        quantity: qty,
        totalEstimated,
        category: category || "EQUIPMENT",
        currency: currency || "EGP",
        taxRate: taxRate || 0.0,
        description,
        vendorId: vendorId || null,
        taskId,
        projectId: task.projectId,
        agencyId: session.user.agencyId,
        status: "DRAFT",
      },
    });

    // Recalculate totals on parent task
    await recalculateTaskExpenseTotals(taskId);

    return NextResponse.json(newExpense, { status: 201 });
  } catch (err: any) {
    console.error("Create planned expense error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}