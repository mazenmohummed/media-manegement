import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. SECURITY: Block if no valid session or agency context
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized: No Agency Context" }, { status: 401 });
    }

    const { startDate, endDate, type, reason } = await req.json();

    // 2. VALIDATION
    if (!startDate || !endDate || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const agencyId = session.user.agencyId;

    // 3. ATOMIC UPDATE: Push the leave request into the user's embedded array
    // We include the agencyId inside the object for easier admin-level filtering later
    const updatedUser = await prisma.user.update({
      where: { 
        id: session.user.id // Prefer ID over email for indexed lookups
      },
      data: {
        leaves: {
          push: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            type: type, // "ANNUAL", "SICK", etc.
            reason: reason || "",
            status: "PENDING",
            agencyId: agencyId, // THE WALL: Essential for global leave dashboards
            createdAt: new Date(),
          },
        },
      },
    });

    return NextResponse.json({ 
      message: "Leave request submitted successfully", 
      leaves: updatedUser.leaves 
    });

  } catch (error: any) {
    console.error("LEAVE_REQUEST_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}