import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

const taskInclude = {
  assignees: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
  category: { select: { id: true, name: true } },
  
  milestone: {
    select: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      tasks: { where: { deletedAt: null }, select: { progress: true } },
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      projectNo: true,
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
  plannedExpenses: true,
  taskExpenses: true,
  _count: { select: { comments: true, todos: true, plannedExpenses: true, taskExpenses: true } },
};
function serializeTask(task: any) {
  let milestoneProgress = 0;
  if (task.milestone) {
    const total = task.milestone.tasks.reduce((sum: number, t: any) => sum + t.progress, 0);
    milestoneProgress = task.milestone.tasks.length > 0 ? Math.round(total / task.milestone.tasks.length) : 0;
  }

  // ── Calculate progress from todos if they exist ───────────────────────────
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
    progress: computedProgress, // Overwrite with dynamic todo progress
    plannedExpenses: formattedPlannedExpenses,
    milestone: task.milestone
      ? {
          id: task.milestone.id,
          name: task.milestone.name,
          status: task.milestone.status,
          deadline: task.milestone.deadline,
          progress: milestoneProgress,
        }
      : null,
  };
}
function getTaskId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  return segments[2]; // /api/tasks/[taskId]
}

// ─── GET ───────────────────────────────────────────────────────────────────
export const GET = withAuthGuard("task:read", async (req: NextRequest, { agencyId }) => {
  const db = getScopedPrisma(agencyId);
  const taskId = getTaskId(req);

  const task = await db.task.findFirst({
    where: { id: taskId, agencyId, deletedAt: null },
    include: taskInclude,
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeTask(task));
});

// ─── PATCH ─────────────────────────────────────────────────────────────────
export const PATCH = withAuthGuard("task:update", async (req: NextRequest, { agencyId }) => {
  const db = getScopedPrisma(agencyId);
  const taskId = getTaskId(req);
  const body = await req.json();

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

  const task = await db.task.update({
    where: { id: taskId, agencyId },
    data,
    include: taskInclude,
  });

  return NextResponse.json(serializeTask(task));
});

// ─── DELETE (soft) ─────────────────────────────────────────────────────────
export const DELETE = withAuthGuard("task:delete", async (req: NextRequest, { agencyId }) => {
  const db = getScopedPrisma(agencyId);
  const taskId = getTaskId(req);

  await db.task.update({
    where: { id: taskId, agencyId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
});