// app/api/milestones/[milestoneId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

// app/api/milestones/[milestoneId]/route.ts - Updated GET handler

// ─── GET /api/milestones/[milestoneId] ──────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const milestone = await db.milestone.findFirst({
      where: {
        id: milestoneId,
        agencyId: session.user.agencyId,
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
            assignees: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
            category: { select: { id: true, name: true } },
            _count: { select: { comments: true, todos: true } },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
        concepts: {
          where: {
            OR: [
              { milestoneId: milestoneId },
              { task: { milestoneId: milestoneId } }
            ]
          },
          include: {
            assets: {
              select: { id: true }
            },
            reviewLinks: {
              where: { isActive: true },
              select: {
                id: true,
                status: true, // This will be ACTIVE, EXPIRED, or REVOKED
                reviewedAt: true,
                reviewedBy: true,
                reviewerEmail: true,
                createdAt: true,
                reviewNotes: true,
                reviewLinkAssetApprovals: {
                  select: {
                    id: true,
                    status: true, // This is the approval status (PENDING, APPROVED, REJECTED, REVISIONS_REQUESTED)
                    feedback: true,
                    approvedAt: true,
                    approvedBy: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
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

    // Calculate progress
    const totalTasks = milestone.tasks.length;
    const completedTasks = milestone.tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Build reviews from concepts' reviewLinks with proper status
    const reviews: any[] = [];
    for (const concept of milestone.concepts) {
      for (const reviewLink of concept.reviewLinks) {
        // Get asset approvals
        const approvals = reviewLink.reviewLinkAssetApprovals || [];
        const totalApprovals = approvals.length;
        const approvedCount = approvals.filter((a) => a.status === 'APPROVED').length;
        const rejectedCount = approvals.filter(
          (a) => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED'
        ).length;
        const pendingCount = approvals.filter((a) => a.status === 'PENDING').length;

        // Determine overall approval status
        let overallStatus = 'PENDING';
        if (totalApprovals > 0) {
          if (pendingCount === 0 && rejectedCount === 0 && approvedCount === totalApprovals) {
            overallStatus = 'APPROVED';
          } else if (rejectedCount > 0) {
            overallStatus = 'REVISIONS_REQUIRED';
          } else if (pendingCount === 0 && approvedCount > 0) {
            overallStatus = 'PARTIALLY_APPROVED';
          }
        }

        reviews.push({
          id: reviewLink.id,
          reviewLinkStatus: reviewLink.status, // ACTIVE, EXPIRED, or REVOKED
          overallStatus: overallStatus, // Computed approval status
          isActive: reviewLink.status === 'ACTIVE',
          reviewedAt: reviewLink.reviewedAt,
          reviewerName: reviewLink.reviewedBy || reviewLink.reviewerEmail,
          createdAt: reviewLink.createdAt,
          conceptName: concept.name,
          conceptId: concept.id,
          reviewNotes: reviewLink.reviewNotes,
          assetApprovals: approvals.map((a) => ({
            id: a.id,
            status: a.status,
            feedback: a.feedback,
            approvedAt: a.approvedAt,
            approvedBy: a.approvedBy,
          })),
          summary: {
            total: totalApprovals,
            approved: approvedCount,
            rejected: rejectedCount,
            pending: pendingCount,
          },
        });
      }
    }

    // Sort reviews by createdAt desc
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get review stats
    const totalReviews = reviews.length;
    const activeReviews = reviews.filter((r) => r.isActive).length;
    const completedReviews = reviews.filter((r) => r.overallStatus === 'APPROVED').length;

    return NextResponse.json({
      success: true,
      milestone: {
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        status: milestone.status,
        deadline: milestone.deadline,
        order: milestone.order,
        progress: progress,
        completedTasks: completedTasks,
        totalTasks: totalTasks,
        project: milestone.project,
        tasks: milestone.tasks,
        concepts: milestone.concepts.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          status: c.status,
          assets: c.assets,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        reviews: reviews,
        reviewStats: {
          total: totalReviews,
          active: activeReviews,
          completed: completedReviews,
        },
        dependsOn: milestone.dependsOn,
        dependents: milestone.dependents,
        owner: milestone.owner,
        createdAt: milestone.createdAt,
        updatedAt: milestone.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[GET_MILESTONE_ERROR]:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

// ─── PATCH /api/milestones/[milestoneId] ────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const existing = await db.milestone.findFirst({
      where: { id: milestoneId, agencyId: session.user.agencyId },
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
          where: { id: ownerId, agencyId: session.user.agencyId, isActive: true },
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
}

// ─── DELETE /api/milestones/[milestoneId] ───────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const existing = await db.milestone.findFirst({
      where: { id: milestoneId, agencyId: session.user.agencyId },
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
}