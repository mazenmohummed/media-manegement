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

    // 1. SECURITY & SESSION CHECK
    if (!agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { itemName, cost, category, description } = body;

    // 2. FETCH TASK TO GET PROJECT ID
    // We do this to ensure the task belongs to the agency and to link the project
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        agencyId: agencyId 
      },
      select: { projectId: true }
    });

    if (!task) {
      return new NextResponse("Task not found or unauthorized", { status: 404 });
    }

    // 3. CREATE SECURE EXPENSE RECORD
    const expense = await prisma.taskExpense.create({
      data: {
        itemName,
        cost: parseFloat(cost) || 0,
        category: category || "MISC", // e.g., "RENTAL", "TRAVEL", "LUNCH"
        description: description || "",
        
        // RELATIONS
        taskId: taskId,
        projectId: task.projectId, // Link to the project for easier reporting
        agencyId: agencyId,        // The essential "Agency Wall"
      }
    });

    return NextResponse.json(expense);
  } catch (error: any) {
    console.error("EXPENSE_CREATION_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}