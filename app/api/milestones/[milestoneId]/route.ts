// app/api/milestones/[milestoneId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/milestones/[milestoneId] ──────────────────────────────────────
export const GET = withAuthGuard("project:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const milestoneId = params.milestoneId;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const milestone = await db.milestone.findFirst({
      where: {
        id: milestoneId,
        agencyId: agencyId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectName: true,
            projectNo: true,
            status: true,
            currency: true,
          },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            taskExpenses: true,
            assignees: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
            category: { select: { id: true, name: true } },
            _count: { select: { comments: true, todos: true } },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
        dependsOn: {
          select: { id: true, name: true, status: true, deadline: true },
        },
        dependents: {
          select: { id: true, name: true, status: true, deadline: true },
        },
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const totalTasks = milestone.tasks.length;
    const completedTasks = milestone.tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalBudgeted = milestone.budget || 0;
    const totalActualExpenses = milestone.tasks.reduce((sum, task) => {
      return sum + (task.taskExpenses?.reduce((s, e) => s + e.cost, 0) || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      milestone: {
        ...milestone,
        totalTasks,
        completedTasks,
        progress,
        budgetVariance: totalBudgeted - totalActualExpenses,
        totalActualExpenses,
      },
    });
  } catch (error: any) {
    console.error("[GET_MILESTONE_ERROR]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
});

// ─── PATCH /api/milestones/[milestoneId] ────────────────────────────────────
export const PATCH = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const milestoneId = params.milestoneId;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const existing = await db.milestone.findFirst({
      where: { id: milestoneId, agencyId: agencyId },
      select: { id: true, projectId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name, description, budget, currency, deadline, status,
      order, riskLevel, approvalStage, ownerId, completedAt,
    } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Milestone name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description;
    if (budget !== undefined) updateData.budget = budget === null ? 0 : Number(budget);
    if (currency !== undefined) updateData.currency = currency;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (status !== undefined) updateData.status = status;
    if (order !== undefined) updateData.order = Number(order);
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (approvalStage !== undefined) updateData.approvalStage = approvalStage;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;

    if (ownerId !== undefined) {
      if (ownerId) {
        const user = await db.user.findFirst({
          where: { id: ownerId, agencyId: agencyId, isActive: true },
          select: { id: true },
        });
        if (!user) {
          return NextResponse.json({ error: "User not found or not active" }, { status: 400 });
        }
        updateData.ownerId = ownerId;
      } else {
        updateData.ownerId = null;
      }
    }

    if (status === "COMPLETED" && !completedAt) {
      updateData.completedAt = new Date();
    }
    if (status && status !== "COMPLETED") {
      updateData.completedAt = null;
    }

    const milestone = await db.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, projectName: true, projectNo: true, status: true },
        },
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ success: true, milestone, message: "Milestone updated successfully" });
  } catch (error: any) {
    console.error("[PATCH_MILESTONE_ERROR]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
});

// ─── DELETE /api/milestones/[milestoneId] ───────────────────────────────────
export const DELETE = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const milestoneId = params.milestoneId;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const existing = await db.milestone.findFirst({
      where: { id: milestoneId, agencyId: agencyId },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { tasks: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (existing._count.tasks > 0 && existing.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: "Cannot delete milestone with active tasks. Complete or move tasks first.",
          tasksCount: existing._count.tasks,
        },
        { status: 400 }
      );
    }

    // No deletedAt column on Milestone — archive via status instead of soft-delete.
    await db.milestone.update({
      where: { id: milestoneId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: `Milestone "${existing.name}" archived successfully`,
      milestoneId: milestoneId,
    });
  } catch (error: any) {
    console.error("[DELETE_MILESTONE_ERROR]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
});