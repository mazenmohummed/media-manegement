import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;
    const body = await req.json();
    const { taskId, startDate, endDate, dueDate } = body;

    if (!taskId && !startDate && !dueDate && !endDate) {
      return NextResponse.json(
        { error: "Task ID or date range is required" },
        { status: 400 }
      );
    }

    // Fetch asset with current active tasks
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: {
            deletedAt: null,
            status: { notIn: ["CANCELLED", "COMPLETED"] },
            ...(taskId ? { id: { not: taskId } } : {}), // Exclude current task if editing
          },
          select: {
            id: true,
            title: true,
            taskNo: true,
            startDate: true,
            endDate: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Determine target task date range
    let targetStart: Date | null = null;
    let targetEnd: Date | null = null;

    if (taskId) {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          agencyId: session.user.agencyId,
          deletedAt: null,
        },
        select: {
          startDate: true,
          endDate: true,
          dueDate: true,
        },
      });

      if (task) {
        targetStart = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : null;
        targetEnd = task.endDate ? new Date(task.endDate) : task.dueDate ? new Date(task.dueDate) : task.startDate ? new Date(task.startDate) : null;
      }
    }

    // Override with provided dates if any
    if (startDate) targetStart = new Date(startDate);
    if (endDate) targetEnd = new Date(endDate);
    if (dueDate && !targetStart) targetStart = new Date(dueDate);
    if (dueDate && !targetEnd) targetEnd = new Date(dueDate);

    // If no dates, no conflict check needed
    if (!targetStart || !targetEnd) {
      return NextResponse.json({
        hasConflict: false,
        conflicts: [],
      });
    }

    // Check for conflicts
    const conflicts = asset.tasks.filter((existingTask) => {
      const existingHasDates = existingTask.startDate || existingTask.dueDate || existingTask.endDate;
      if (!existingHasDates) return false;

      const existingStart = existingTask.startDate 
        ? new Date(existingTask.startDate) 
        : new Date(existingTask.dueDate || existingTask.endDate!);
      
      const existingEnd = existingTask.endDate 
        ? new Date(existingTask.endDate) 
        : new Date(existingTask.dueDate || existingTask.startDate!);

      return (
        targetStart! <= existingEnd && targetEnd! >= existingStart
      );
    });

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.map((c) => ({
        taskId: c.id,
        taskTitle: c.title || "Untitled Task",
        taskNo: c.taskNo || c.id.slice(0, 8),
        startDate: c.startDate,
        dueDate: c.dueDate,
        endDate: c.endDate,
      })),
    });
  } catch (error) {
    console.error("Failed to check asset conflict:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}