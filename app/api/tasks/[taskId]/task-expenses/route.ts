import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const taskExpenses = await prisma.taskExpense.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ taskExpenses }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch task expenses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();
    const { itemName, cost, category, description, reimbursable } = body;

    if (!itemName) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    // Pull projectId/agencyId from the parent task so the client
    // can't spoof them and Prisma's required fields are satisfied.
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, agencyId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskExpense = await prisma.taskExpense.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        agencyId: task.agencyId,
        itemName,
        cost: parseFloat(cost) || 0,
        category: category || "EQUIPMENT",
        description: description || null,
        reimbursable: Boolean(reimbursable),
        status: "PENDING",
      },
    });

    return NextResponse.json({ taskExpense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task expense:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}