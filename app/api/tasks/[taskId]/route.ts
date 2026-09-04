// app/api/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const taskInclude = {
  assignees: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
  category: { select: { id: true, name: true } },
  milestone: {
    select: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      // Include tasks to calculate progress
      tasks: { 
        where: { deletedAt: null }, 
        select: { progress: true } 
      },
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      projectNo: true,
      projectName: true,
      client: {
        select: { id: true, clientName: true, email: true, phoneNumber: true, accountType: true },
      },
    },
  },
  dependsOn: { select: { id: true, title: true, taskNo: true, status: true } },
  dependents: { select: { id: true, title: true, taskNo: true, status: true } },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  todos: {
    include: {
      createdBy: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
    orderBy: [{ completed: "asc" as const }, { order: "asc" as const }],
  },
  assets: {
    where: { deletedAt: null },
    select: {
      id: true,
      assetName: true,
      assetNo: true,
      availabilityStatus: true,
    },
  },
  plannedExpenses: {
    select: {
      id: true,
      itemName: true,
      category: true,
      quantity: true,
      unitCost: true,
      taxRate: true,
      totalEstimated: true,
      status: true,
    },
  },
  taskExpenses: {
    select: {
      id: true,
      itemName: true,
      cost: true,
      category: true,
      status: true,
      reimbursable: true,
      incurredAt: true,
    },
  },
  _count: { select: { comments: true, todos: true, plannedExpenses: true, taskExpenses: true } },
};

function serializeTask(task: any) {
  // Calculate milestone progress
  let milestoneProgress = 0;
  if (task.milestone && task.milestone.tasks) {
    const total = task.milestone.tasks.reduce((sum: number, t: any) => sum + t.progress, 0);
    milestoneProgress = task.milestone.tasks.length > 0 
      ? Math.round(total / task.milestone.tasks.length) 
      : 0;
  }

  // Calculate progress from todos
  let computedProgress = task.progress;
  if (task.todos && task.todos.length > 0) {
    const completedCount = task.todos.filter((todo: any) => todo.completed).length;
    computedProgress = Math.round((completedCount / task.todos.length) * 100);
  }

  const formattedPlannedExpenses = (task.plannedExpenses || []).map((item: any) => ({
    id: item.id,
    itemName: item.itemName,
    category: item.category,
    quantity: item.quantity ?? 1,
    unitCost: item.unitCost ?? item.estimatedCost, 
    taxRate: item.taxRate ?? 0,
    totalEstimated: item.totalEstimated ?? item.estimatedCost,
    status: item.status,
  }));

  return {
    ...task,
    progress: computedProgress,
    plannedExpenses: formattedPlannedExpenses,
    milestone: task.milestone
      ? {
          id: task.milestone.id,
          name: task.milestone.name,
          status: task.milestone.status,
          deadline: task.milestone.deadline,
          progress: milestoneProgress,
          // Remove tasks to avoid circular references
          tasks: undefined,
        }
      : null,
  };
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await db.task.findFirst({
      where: { 
        id: taskId, 
        agencyId: session.user.agencyId, 
        deletedAt: null 
      },
      include: taskInclude,
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(serializeTask(task));
  } catch (error: any) {
    console.error("[TASK_GET_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();

    // ── Completion validation: check dependencies if status is COMPLETED ──
    if (body.status === "COMPLETED") {
      const task = await db.task.findFirst({
        where: { id: taskId, agencyId: session.user.agencyId, deletedAt: null },
        include: {
          dependsOn: {
            select: { id: true, status: true, title: true, taskNo: true }
          }
        }
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const blockingDependencies = task.dependsOn.filter(
        dep => dep.status !== "COMPLETED" && dep.status !== "CANCELLED"
      );

      if (blockingDependencies.length > 0) {
        return NextResponse.json(
          { 
            error: "Cannot complete task: blocking dependencies are still open",
            blockingDependencies: blockingDependencies.map(dep => ({
              id: dep.id,
              title: dep.title,
              taskNo: dep.taskNo,
              status: dep.status
            }))
          },
          { status: 400 }
        );
      }
    }

    // ── Prepare update data ──────────────────────────────────────────────────
    const allowedScalars = [
      "title", "description", "status", "priority", "progress",
      "dueDate", "startDate", "endDate",
      "milestoneId", "categoryId", "projectId",
      "estimatedHours", "actualHours",
    ];

    const data: any = {};
    for (const key of allowedScalars) {
      if (body[key] !== undefined) {
        data[key] = ["dueDate", "startDate", "endDate"].includes(key) && body[key]
          ? new Date(body[key])
          : body[key];
      }
    }

    // Auto completedAt
    if (body.status === "COMPLETED" && !body.completedAt) data.completedAt = new Date();
    if (body.status && body.status !== "COMPLETED") data.completedAt = null;

    // ── assigneeIds: replace all assignees ──────────────────────────────────
    if (Array.isArray(body.assigneeIds)) {
      data.assignees = {
        set: body.assigneeIds.map((id: string) => ({ id })),
      };
    }

    // ── Execute update ──────────────────────────────────────────────────────
    const task = await db.task.update({
      where: { id: taskId, agencyId: session.user.agencyId },
      data,
      include: taskInclude,
    });

    return NextResponse.json(serializeTask(task));
  } catch (error: any) {
    console.error("[TASK_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// ─── DELETE (soft) ─────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    await db.task.update({
      where: { id: taskId, agencyId: session.user.agencyId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[TASK_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}