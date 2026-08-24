import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NotificationType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ scheduleId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const currentUserId = session.user.id;
    const { scheduleId } = await params;

    // Verify the schedule belongs to a contract managed by this agency and fetch relation data
    const existingSchedule = await db.recurringInvoiceSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        contract: {
          select: { 
            agencyId: true,
            userId: true, // Account manager if assigned
            contractNo: true,
            name: true,
          },
        },
      },
    });

    if (!existingSchedule || existingSchedule.agencyId !== agencyId) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const body = await request.json();
    const { isActive } = body;

    // Update the recurring invoice schedule status[cite: 6]
    const updatedSchedule = await db.recurringInvoiceSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Determine who to notify (e.g., the contract's assigned user or fallback to the person making the request)
    const targetUserId = existingSchedule.contract?.userId || currentUserId;

    // Create a notification record in the database
    await db.notification.create({
      data: {
        title: "Recurring Schedule Updated",
        message: `The recurring schedule "${updatedSchedule.name}" has been marked as ${updatedSchedule.isActive ? "Active" : "Inactive"}.`,
        type: NotificationType.INFO,
        actionUrl: existingSchedule.contractId ? `/dashboard/contracts/${existingSchedule.contractId}` : undefined,
        userId: targetUserId,
        agencyId: agencyId,
      },
    });

    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error: any) {
    console.error("[SCHEDULE_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update schedule status" },
      { status: 500 }
    );
  }
}