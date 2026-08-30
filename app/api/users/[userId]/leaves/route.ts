// app/api/users/[userId]/leaves/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/users/[userId]/leaves ───────────────────────────────────────
export const GET = withAuthGuard("user:read", async (req, { agencyId }, context) => {
  try {
    const { userId } = await context.params;
    const db = getScopedPrisma(agencyId);

    const employee = await db.user.findFirst({
      where: { id: userId, agencyId },
      include: {
        leaves: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const leavesWithApprovals = await Promise.all(
      employee.leaves.map(async (leave) => {
        const approval = await db.approvalRequest.findFirst({
          where: { entityType: "LEAVE", entityId: leave.id },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            decider: { select: { id: true, name: true, email: true } },
          },
        });

        return { ...leave, approval: approval || null };
      })
    );

    return NextResponse.json({ success: true, leaves: leavesWithApprovals });
  } catch (error: any) {
    console.error("[GET_LEAVES_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaves" },
      { status: 500 }
    );
  }
});

// ─── POST /api/users/[userId]/leaves ──────────────────────────────────────
export const POST = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { userId } = await context.params;
    const body = await req.json();
    const { startDate, endDate, type, reason } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing required dates" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const employee = await db.user.findFirst({ where: { id: userId, agencyId } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const leave = await db.leave.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || "ANNUAL",
        status: "PENDING",
        reason: reason || null,
        user: { connect: { id: userId } },
        agency: { connect: { id: agencyId } },
      },
    });

    const approvalRequest = await db.approvalRequest.create({
      data: {
        entityType: "LEAVE",
        entityId: leave.id,
        status: "PENDING",
        agencyId,
        requesterId: userId,
      },
    });

    return NextResponse.json({
      message: "Leave requested successfully",
      leave,
      approvalRequest,
    });
  } catch (error: any) {
    console.error("[CREATE_LEAVE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to request leave" },
      { status: 500 }
    );
  }
});

// ─── PUT /api/users/[userId]/leaves ───────────────────────────────────────
export const PUT = withAuthGuard("user:create", async (req, { agencyId, userId: sessionUserId }, context) => {
  try {
    const { userId } = await context.params;
    const body = await req.json();
    const { leaveId, startDate, endDate, type, status, reason } = body;

    if (!leaveId) {
      return NextResponse.json({ error: "leaveId is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const targetLeave = await db.leave.findFirst({
      where: { id: leaveId, userId, agencyId },
    });

    if (!targetLeave) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(type && { type }),
      ...(status && { status }),
      ...(reason !== undefined && { reason: reason || null }),
    };

    // If status is APPROVED, set the approvedBy field to the current user's ID
    if (status === "APPROVED") {
      updateData.approvedBy = sessionUserId;
    }

    // If status is REJECTED, clear the approvedBy field
    if (status === "REJECTED") {
      updateData.approvedBy = null;
    }

    const updatedLeave = await db.leave.update({
      where: { id: targetLeave.id },
      data: updateData,
    });

    // Keep the linked approval request in sync when status changes
    if (status) {
      const approval = await db.approvalRequest.findFirst({
        where: { entityType: "LEAVE", entityId: leaveId, agencyId },
      });
      if (approval) {
        await db.approvalRequest.update({
          where: { id: approval.id },
          data: { 
            status: status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
            decidedAt: status === "APPROVED" || status === "REJECTED" ? new Date() : null,
            deciderId: status === "APPROVED" || status === "REJECTED" ? sessionUserId : null,
            ...(reason !== undefined && { notes: reason || null }),
          },
        });
      }
    }

    return NextResponse.json({
      message: status
        ? `Leave request status marked as ${status}`
        : "Leave record updated successfully",
      leave: updatedLeave,
    });
  } catch (error: any) {
    console.error("[UPDATE_LEAVE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update leave record" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/users/[userId]/leaves?leaveId=... ────────────────────────
export const DELETE = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(req.url);
    const leaveId = searchParams.get("leaveId");

    if (!leaveId) {
      return NextResponse.json({ error: "Leave ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const leave = await db.leave.findFirst({
      where: { id: leaveId, userId, agencyId },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    await db.leave.delete({ where: { id: leaveId } });

    return NextResponse.json({ message: "Leave record deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE_LEAVE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete leave record" },
      { status: 500 }
    );
  }
});