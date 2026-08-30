// app/api/tasks/[taskId]/assignees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── POST /api/tasks/[taskId]/assignees ──────────────────────────────────────
export const POST = withAuthGuard("assignee:add", async (req: NextRequest, { agencyId }, context) => {
  try {
    // ✅ Await params before accessing properties (Next.js 15+)
    const params = await context.params;
    const taskId = params.taskId;

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Verify task exists
    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      include: {
        assignees: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user is already assigned
    const isAlreadyAssigned = task.assignees.some((a: any) => a.id === userId);
    if (isAlreadyAssigned) {
      return NextResponse.json(
        { error: "User is already assigned to this task" },
        { status: 400 }
      );
    }

    // Verify user exists and belongs to the agency
    const user = await db.user.findFirst({
      where: { id: userId, agencyId, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add assignee
    const updatedTask = await db.task.update({
      where: { id: taskId, agencyId },
      data: {
        assignees: { connect: { id: userId } },
      },
      include: {
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        project: {
          select: { id: true, name: true, projectName: true },
        },
      },
    });

    // Create notification for the new assignee
    await db.notification.create({
      data: {
        title: "Task Assigned",
        message: `You have been assigned to task: ${task.title || task.taskNo || "Task"}`,
        type: "ASSIGNMENT",
        userId: userId,
        agencyId: agencyId,
        actionUrl: `/dashboard/tasks/${taskId}`,
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: "Assignee added successfully",
    });
  } catch (error: any) {
    console.error("[ADD_ASSIGNEE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to add assignee" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/tasks/[taskId]/assignees ────────────────────────────────────
export const DELETE = withAuthGuard("assignee:remove", async (req: NextRequest, { agencyId }, context) => {
  try {
    // ✅ Await params before accessing properties (Next.js 15+)
    const params = await context.params;
    const taskId = params.taskId;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Verify task exists
    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      include: {
        assignees: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user is assigned
    const isAssigned = task.assignees.some((a: any) => a.id === userId);
    if (!isAssigned) {
      return NextResponse.json(
        { error: "User is not assigned to this task" },
        { status: 400 }
      );
    }

    // Remove assignee
    const updatedTask = await db.task.update({
      where: { id: taskId, agencyId },
      data: {
        assignees: { disconnect: { id: userId } },
      },
      include: {
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        project: {
          select: { id: true, name: true, projectName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: "Assignee removed successfully",
    });
  } catch (error: any) {
    console.error("[REMOVE_ASSIGNEE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove assignee" },
      { status: 500 }
    );
  }
});

// ─── GET /api/tasks/[taskId]/assignees ──────────────────────────────────────
export const GET = withAuthGuard("assignee:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    // ✅ Await params before accessing properties (Next.js 15+)
    const params = await context.params;
    const taskId = params.taskId;

    const db = getScopedPrisma(agencyId);

    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      select: {
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignees: task.assignees,
    });
  } catch (error: any) {
    console.error("[GET_ASSIGNEES_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignees" },
      { status: 500 }
    );
  }
});