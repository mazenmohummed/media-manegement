import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── POST /api/users/[id]/leaves ──────────────────────────────────────────
export const POST = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { startDate, endDate, type } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing required dates" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Verify employee ownership within tenant context
    const employee = await db.user.findFirst({
      where: { id, agencyId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Use Prisma relation syntax 'create' instead of MongoDB array 'push'
    const updatedEmployee = await db.user.update({
      where: { id },
      data: {
        leaves: {
          create: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            type: type || "ANNUAL",
            status: "Pending",
          },
        },
      },
      include: {
        leaves: true,
      },
    });

    return NextResponse.json({
      message: "Leave requested successfully",
      leaves: updatedEmployee.leaves,
    });
  } catch (error: any) {
    console.error("[CREATE_LEAVE_ERROR]", error);
    return NextResponse.json({ error: "Failed to request leave" }, { status: 500 });
  }
});

// ─── PUT /api/users/[id]/leaves ───────────────────────────────────────────
export const PUT = withAuthGuard("user:create", async (req, { agencyId }, context) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { leaveId, targetStartDate, startDate, endDate, type, status } = body;

    const db = getScopedPrisma(agencyId);

    const employee = await db.user.findFirst({
      where: { id, agencyId },
      include: { leaves: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Find target leave record either by ID or by matching startDate
    const targetLeave = employee.leaves.find((leave: any) => 
      leaveId ? leave.id === leaveId : new Date(leave.startDate).toISOString() === new Date(targetStartDate).toISOString()
    );

    if (!targetLeave) {
      return NextResponse.json({ error: "Specific leave target record not found" }, { status: 404 });
    }

    // Update relational record via nested update or direct leave query
    const updatedEmployee = await db.user.update({
      where: { id },
      data: {
        leaves: {
          update: {
            where: { id: targetLeave.id },
            data: {
              ...(startDate && { startDate: new Date(startDate) }),
              ...(endDate && { endDate: new Date(endDate) }),
              ...(type && { type }),
              ...(status && { status }),
            },
          },
        },
      },
      include: {
        leaves: true,
      },
    });

    return NextResponse.json({
      message: status
        ? `Leave request status marked as ${status}`
        : "Leave record updated successfully",
      leaves: updatedEmployee.leaves,
    });
  } catch (error: any) {
    console.error("[UPDATE_LEAVE_ERROR]", error);
    return NextResponse.json({ error: "Failed to update leave record" }, { status: 500 });
  }
});