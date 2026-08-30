// ─── /api/users/leaves/[leaveId]/approve ─────────────────────────────
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";


export const PUT = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { leaveId } = await context.params;
    const body = await req.json();
    const { action, notes, deciderId } = body; // action: "APPROVE" or "REJECT"

    const db = getScopedPrisma(agencyId);

    // Find the leave
    const leave = await db.leave.findFirst({
      where: {
        id: leaveId,
        agencyId: agencyId,
      },
      include: {
        user: true,
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    // Find the approval request
    const approvalRequest = await db.approvalRequest.findFirst({
      where: {
        entityType: "LEAVE",
        entityId: leaveId,
        agencyId: agencyId,
      },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 }
      );
    }

    // Update approval request
    const updatedApproval = await db.approvalRequest.update({
      where: { id: approvalRequest.id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        decidedAt: new Date(),
        notes: notes || null,
        deciderId: deciderId || null,
      },
    });

    // Update leave status
    const updatedLeave = await db.leave.update({
      where: { id: leaveId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedBy: updatedApproval.deciderId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Leave request ${action.toLowerCase()}d successfully`,
      leave: updatedLeave,
      approval: updatedApproval,
    });
  } catch (error: any) {
    console.error("[APPROVE_LEAVE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process leave request" },
      { status: 500 }
    );
  }
});