import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        // Direct link since we added agencyId to the Task model
        agencyId: agencyId 
      },
      include: {
        project: {
          select: { projectName: true, projectNo: true }
        },
        assignee: {
          select: { name: true, role: true, userType: true }
        },
        assets: true,
        taskExpenses: true // Updated from externalRentals
      },
      orderBy: { lastUpdateTimestamp: 'desc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("FETCH_TASKS_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, progress, description, startDate, endDate, internalCost } = body;

    // 1. VERIFY OWNERSHIP before updating
    // This prevents someone from Agency A updating a task from Agency B
    const existingTask = await prisma.task.findFirst({
      where: { id, agencyId }
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // 2. PERFORM SECURE UPDATE
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        progress: progress ? parseInt(progress) : undefined,
        description,
        internalCost: internalCost ? parseFloat(internalCost) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("UPDATE_TASK_ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}