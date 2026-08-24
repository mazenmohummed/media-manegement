import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NotificationType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await request.json();
    const { 
      contractId, 
      name, 
      amount, 
      currency, 
      frequency, 
      startDate, 
      isActive 
    } = body;

    if (!contractId || !name || !amount || !frequency || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields for recurring schedule" },
        { status: 400 }
      );
    }

    // Verify contract belongs to the agency and fetch its clientId
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      select: { id: true, agencyId: true, userId: true, name: true, clientId: true },
    });

    if (!contract || contract.agencyId !== agencyId) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Create the recurring schedule record using schema-compliant fields
    const recurringSchedule = await db.recurringInvoiceSchedule.create({
      data: {
        agencyId,
        contractId,
        clientId: contract.clientId, // Required by schema relation
        name,
        amount: parseFloat(amount),
        currency: currency || "EGP",
        frequency,
        nextRunDate: new Date(startDate), // Fixed: mapped to schema field name
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Optionally notify assigned user
    if (contract.userId) {
      await db.notification.create({
        data: {
          title: "New Recurring Schedule Created",
          message: `A new recurring schedule "${name}" was linked to contract ${contract.name}.`,
          type: NotificationType.INFO,
          actionUrl: `/dashboard/contracts/${contractId}`,
          userId: contract.userId,
          agencyId,
        },
      });
    }

    return NextResponse.json(recurringSchedule, { status: 201 });
  } catch (error: any) {
    console.error("[RECURRING_SCHEDULE_CREATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}