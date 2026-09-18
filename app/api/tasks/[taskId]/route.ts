// app/api/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { z, ZodError } from 'zod';

// ─── Shared Include Config ──────────────────────────────────────────────

const taskInclude = {
  assignees: {
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
  },
  category: { select: { id: true, name: true } },
  milestone: {
    select: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      tasks: {
        where: { deletedAt: null },
        select: { progress: true },
      },
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      projectNo: true,
      projectName: true,
      currency: true,
      client: {
        select: {
          id: true,
          clientName: true,
          email: true,
          phoneNumber: true,
          accountType: true,
        },
      },
    },
  },
  dependsOn: {
    select: { id: true, title: true, taskNo: true, status: true },
  },
  dependents: {
    select: { id: true, title: true, taskNo: true, status: true },
  },
  tags: { select: { id: true, name: true, color: true } },
  comments: {
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  todos: {
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
    orderBy: [{ completed: 'asc' as const }, { order: 'asc' as const }],
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
  _count: {
    select: {
      comments: true,
      todos: true,
      plannedExpenses: true,
      taskExpenses: true,
    },
  },
};

// ─── Serializer ─────────────────────────────────────────────────────────

function serializeTask(task: any) {
  let milestoneProgress = 0;
  if (task.milestone && task.milestone.tasks) {
    const total = task.milestone.tasks.reduce(
      (sum: number, t: any) => sum + t.progress,
      0
    );
    milestoneProgress =
      task.milestone.tasks.length > 0
        ? Math.round(total / task.milestone.tasks.length)
        : 0;
  }

  let computedProgress = task.progress;
  if (task.todos && task.todos.length > 0) {
    const completedCount = task.todos.filter((todo: any) => todo.completed).length;
    computedProgress = Math.round((completedCount / task.todos.length) * 100);
  }

  const formattedPlannedExpenses = (task.plannedExpenses || []).map(
    (item: any) => ({
      id: item.id,
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity ?? 1,
      unitCost: item.unitCost ?? item.estimatedCost,
      taxRate: item.taxRate ?? 0,
      totalEstimated: item.totalEstimated ?? item.estimatedCost,
      status: item.status,
    })
  );

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
          tasks: undefined,
        }
      : null,
  };
}

// ─── Validation Schema ──────────────────────────────────────────────────

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(['PENDING', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  progress: z.number().min(0).max(100).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  dependencyIds: z.array(z.string()).optional(),
});

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: taskInclude,
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ✅ Return both: { task } for new clients, plus serialized for legacy
    const serialized = serializeTask(task);
    return NextResponse.json({ task: serialized });
  } catch (error: any) {
    console.error('[TASK_GET_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// ─── PUT (also handles PATCH-style partial updates) ─────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { taskId } = await params;
    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    // ─── Fetch existing task ─────────────────────────────────────────
    const existing = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      include: { dependsOn: { select: { id: true, status: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── Completion validation: block if dependencies are open ───────
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      const blockingDependencies = existing.dependsOn.filter(
        (dep) => dep.status !== 'COMPLETED' && dep.status !== 'CANCELLED'
      );

      if (blockingDependencies.length > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot complete task: blocking dependencies are still open',
            blockingDependencies,
          },
          { status: 400 }
        );
      }
    }

    // ─── Validate milestone ──────────────────────────────────────────
    if (data.milestoneId) {
      const milestone = await db.milestone.findFirst({
        where: {
          id: data.milestoneId,
          projectId: existing.projectId,
          agencyId,
          deletedAt: null,
        },
      });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found in this project' },
          { status: 404 }
        );
      }
    }

    // ─── Validate category ───────────────────────────────────────────
    if (data.categoryId) {
      const category = await db.taskCategory.findFirst({
        where: { id: data.categoryId, agencyId, deletedAt: null },
      });
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }
    }

    // ─── Prevent circular dependencies ───────────────────────────────
    if (data.dependencyIds && data.dependencyIds.length > 0) {
      if (data.dependencyIds.includes(taskId)) {
        return NextResponse.json(
          { error: 'A task cannot depend on itself' },
          { status: 400 }
        );
      }

      const validDeps = await db.task.findMany({
        where: {
          id: { in: data.dependencyIds },
          projectId: existing.projectId,
          agencyId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (validDeps.length !== data.dependencyIds.length) {
        return NextResponse.json(
          { error: 'One or more dependencies are invalid' },
          { status: 400 }
        );
      }
    }

    // ─── Auto-manage completedAt ─────────────────────────────────────
    let completedAt = existing.completedAt;
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      completedAt = new Date();
    } else if (
      data.status &&
      data.status !== 'COMPLETED' &&
      existing.status === 'COMPLETED'
    ) {
      completedAt = null;
    }

    // ─── Build update data ───────────────────────────────────────────
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.estimatedHours !== undefined)
      updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.startDate !== undefined)
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined)
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.milestoneId !== undefined) updateData.milestoneId = data.milestoneId;
    if (data.locationName !== undefined)
      updateData.locationName = data.locationName;

    if (completedAt !== existing.completedAt) {
      updateData.completedAt = completedAt;
    }

    // ─── Relations ───────────────────────────────────────────────────
    if (data.assigneeIds !== undefined) {
      updateData.assignees = { set: data.assigneeIds.map((id) => ({ id })) };
    }
    if (data.tagIds !== undefined) {
      updateData.tags = { set: data.tagIds.map((id) => ({ id })) };
    }
    if (data.dependencyIds !== undefined) {
      updateData.dependsOn = { set: data.dependencyIds.map((id) => ({ id })) };
    }

    // ─── Update ──────────────────────────────────────────────────────
    const updated = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: taskInclude,
    });

    // ─── Audit log ───────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'TASK',
        entityId: taskId,
        message: `Updated task ${updated.title || taskId}`,
        agencyId,
        actorId: session.user.id,
        metadata: {
          taskNo: updated.taskNo,
          status: updated.status,
          priority: updated.priority,
        },
      },
    });

    return NextResponse.json({ task: serializeTask(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    console.error('[TASK_UPDATE_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// ─── PATCH (alias for PUT — keep for backward compatibility) ────────────

export const PATCH = PUT;

// ─── DELETE (soft) ──────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const existing = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check for open dependents
    const openDependents = await db.task.count({
      where: {
        dependsOn: { some: { id: taskId } },
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    if (openDependents > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete task: other open tasks depend on it',
          openDependents,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db.task.update({
      where: { id: taskId, agencyId: session.user.agencyId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'TASK',
        entityId: taskId,
        message: `Deleted task ${existing.title || taskId}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: { taskNo: existing.taskNo },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TASK_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}