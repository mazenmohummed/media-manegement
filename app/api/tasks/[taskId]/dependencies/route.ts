// app/api/tasks/[taskId]/dependencies/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── POST /api/tasks/[taskId]/dependencies ──────────────────────────────
export const POST = withAuthGuard("task:update", async (req, { agencyId }, context) => {
  try {
    // ✅ Fix: await params before accessing properties
    const params = await context.params;
    const taskId = params.taskId;
    
    const body = await req.json();
    const { dependsOnId } = body;

    if (!dependsOnId) {
      return NextResponse.json({ error: "dependsOnId is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Prevent self-dependency
    if (dependsOnId === taskId) {
      return NextResponse.json({ error: "Cannot depend on itself" }, { status: 400 });
    }

    // Check if the dependency already exists
    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId,
        dependsOn: {
          some: { id: dependsOnId }
        }
      }
    });

    if (existingTask) {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 400 });
    }

    // Check for circular dependency
    const circularCheck = await db.task.findFirst({
      where: {
        id: dependsOnId,
        agencyId,
        dependsOn: {
          some: { id: taskId }
        }
      }
    });

    if (circularCheck) {
      return NextResponse.json({ error: "Circular dependency detected" }, { status: 400 });
    }

    // Add the dependency
    const task = await db.task.update({
      where: { 
        id: taskId,
        agencyId 
      },
      data: {
        dependsOn: {
          connect: { id: dependsOnId }
        }
      },
      include: {
        dependsOn: {
          select: { id: true, title: true, taskNo: true, status: true }
        },
        dependents: {
          select: { id: true, title: true, taskNo: true, status: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      task,
      message: "Dependency added successfully" 
    });
  } catch (error: any) {
    console.error("[ADD_DEPENDENCY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to add dependency" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/tasks/[taskId]/dependencies ─────────────────────────────
export const DELETE = withAuthGuard("task:update", async (req, { agencyId }, context) => {
  try {
    // ✅ Fix: await params before accessing properties
    const params = await context.params;
    const taskId = params.taskId;

    const { searchParams } = new URL(req.url);
    const dependsOnId = searchParams.get("dependsOnId");

    if (!dependsOnId) {
      return NextResponse.json({ error: "dependsOnId is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Verify the dependency exists
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId,
        dependsOn: {
          some: { id: dependsOnId }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
    }

    // Remove the dependency
    const updatedTask = await db.task.update({
      where: { 
        id: taskId,
        agencyId 
      },
      data: {
        dependsOn: {
          disconnect: { id: dependsOnId }
        }
      },
      include: {
        dependsOn: {
          select: { id: true, title: true, taskNo: true, status: true }
        },
        dependents: {
          select: { id: true, title: true, taskNo: true, status: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      task: updatedTask,
      message: "Dependency removed successfully" 
    });
  } catch (error: any) {
    console.error("[REMOVE_DEPENDENCY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove dependency" },
      { status: 500 }
    );
  }
});

// ─── GET /api/tasks/[taskId]/dependencies ────────────────────────────────
export const GET = withAuthGuard("task:read", async (req, { agencyId }, context) => {
  try {
    // ✅ Fix: await params before accessing properties
    const params = await context.params;
    const taskId = params.taskId;

    const db = getScopedPrisma(agencyId);

    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId,
        deletedAt: null
      },
      include: {
        dependsOn: {
          select: { id: true, title: true, taskNo: true, status: true }
        },
        dependents: {
          select: { id: true, title: true, taskNo: true, status: true }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      dependsOn: task.dependsOn,
      dependents: task.dependents
    });
  } catch (error: any) {
    console.error("[GET_DEPENDENCIES_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dependencies" },
      { status: 500 }
    );
  }
});