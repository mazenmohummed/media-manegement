import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const plannedExpenses = await db.taskPlannedExpense.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plannedExpenses });
  } catch (error) {
    console.error("Failed to fetch planned expenses:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const { itemName, category, quantity, unitCost, taxRate, description, vendorId } = body;

    if (!itemName || itemName.trim() === "") {
      return NextResponse.json(
        { error: "Item name is required" },
        { status: 400 }
      );
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const qty = Number(quantity) || 1;
    const cost = Number(unitCost) || 0;
    const tax = Number(taxRate) || 0;
    
    const totalEstimated = qty * cost * (1 + tax / 100);

    const plannedExpense = await db.taskPlannedExpense.create({
      data: {
        itemName: itemName.trim(),
        category: category || "EQUIPMENT",
        quantity: qty,
        unitCost: cost,
        taxRate: tax,
        totalEstimated,
        estimatedCost: totalEstimated,
        description: description?.trim() || null,
        vendorId: vendorId || null,
        taskId,
        projectId: task.projectId,
        agencyId: task.agencyId,
      },
    });

    return NextResponse.json({ plannedExpense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create planned expense:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}