// app/api/leaves/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Await params
    const { id: userId } = await params;

    const body = await req.json();
    // Prefer leaveId; keep leaveIndex as a legacy fallback if that's what the client sends
    const { leaveId, leaveIndex, status } = body as {
      leaveId?: string;
      leaveIndex?: number;
      status?: string;
    };

    if (!leaveId && leaveIndex === undefined) {
      return NextResponse.json(
        { error: "Missing leaveId (or leaveIndex)" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "Missing status" },
        { status: 400 }
      );
    }

    // 2. Fetch the user and their leaves (ordered so leaveIndex is stable)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        leaves: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // 3. Resolve the leave row to update
    const targetLeave =
      leaveId != null
        ? targetUser.leaves.find((l) => l.id === leaveId)
        : targetUser.leaves[leaveIndex!];

    if (!targetLeave) {
      return NextResponse.json(
        { error: "Target leave not found" },
        { status: 404 }
      );
    }

    // 4. Update the Leave row directly
    const updatedLeave = await prisma.leave.update({
      where: { id: targetLeave.id },
      data: {
        status,
        approvedBy: status === "Approved" ? userId : targetLeave.approvedBy,
        // `updatedAt` is `@default(now())` in the schema — not `@updatedAt`.
        // So we set it manually:
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, leave: updatedLeave });
  } catch (error: any) {
    console.error("LEAVE_UPDATE_ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to execute database profile write",
        details: error.message,
      },
      { status: 500 }
    );
  }
}