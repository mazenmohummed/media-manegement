// app/api/users/leaves/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/users/leaves ────────────────────────────────────────────────
// GET: Get all leaves for all employees in the agency
export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter conditions
    const whereConditions: any = {
      agencyId: agencyId,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (startDate && endDate) {
      whereConditions.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereConditions.startDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereConditions.endDate = {
        lte: new Date(endDate),
      };
    }

    // Get all leaves for the agency with user information
    const leaves = await db.leave.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            userType: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        agency: {
          select: {
            id: true,
            agencyName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get approval requests for all leaves
    const leaveIds = leaves.map(leave => leave.id);
    const approvals = await db.approvalRequest.findMany({
      where: {
        entityType: "LEAVE",
        entityId: { in: leaveIds },
        agencyId: agencyId,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        decider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Map approvals to leaves
    const leavesWithApprovals = leaves.map((leave) => {
      const approval = approvals.find(a => a.entityId === leave.id);
      return {
        ...leave,
        approval: approval || null,
      };
    });

    // Calculate statistics
    const stats = {
      total: leavesWithApprovals.length,
      pending: leavesWithApprovals.filter(l => l.status === "PENDING").length,
      approved: leavesWithApprovals.filter(l => l.status === "APPROVED").length,
      rejected: leavesWithApprovals.filter(l => l.status === "REJECTED").length,
    };

    return NextResponse.json({
      success: true,
      leaves: leavesWithApprovals,
      stats: stats,
    });
  } catch (error: any) {
    console.error("[GET_ALL_LEAVES_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaves" },
      { status: 500 }
    );
  }
});

