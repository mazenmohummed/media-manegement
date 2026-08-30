// app/api/tasks/[taskId]/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── PATCH /api/tasks/[taskId]/tags ──────────────────────────────────────
export const PATCH = withAuthGuard("task:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;
    
    const body = await req.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: "tagIds must be an array" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Verify task exists
    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update tags (set replaces all tags)
    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        tags: {
          set: tagIds.map(id => ({ id })),
        },
      },
      include: {
        tags: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json({ success: true, tags: updated.tags });
  } catch (error: any) {
    console.error("[UPDATE_TASK_TAGS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task tags" },
      { status: 500 }
    );
  }
});

// ─── GET /api/tasks/[taskId]/tags ──────────────────────────────────────
export const GET = withAuthGuard("task:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const taskId = params.taskId;

    const db = getScopedPrisma(agencyId);

    const task = await db.task.findFirst({
      where: { id: taskId, agencyId, deletedAt: null },
      include: {
        tags: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tags: task.tags });
  } catch (error: any) {
    console.error("[GET_TASK_TAGS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch task tags" },
      { status: 500 }
    );
  }
});