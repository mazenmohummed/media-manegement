// app/api/leaves/request/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Auth guard
    if (!session?.user?.agencyId) {
      return NextResponse.json(
        { error: "Unauthorized: No Agency Context" },
        { status: 401 }
      );
    }

    const { startDate, endDate, type, reason } = await req.json();

    // 2. Validation
    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3. Create the Leave row directly (it's a relation, not an embedded array)
    const newLeave = await prisma.leave.create({
      data: {
        userId: session.user.id,
        agencyId: session.user.agencyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        reason: reason || "",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      message: "Leave request submitted successfully",
      leave: newLeave,
    });
  } catch (error: any) {
    console.error("LEAVE_REQUEST_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}