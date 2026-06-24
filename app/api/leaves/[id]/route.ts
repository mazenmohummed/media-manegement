import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Type definition for Next.js async params
) {
  try {
    // 1. Await params before unlocking dynamic properties
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    const body = await req.json();
    const { leaveIndex, status } = body; // status comes in as "Approved" or "Rejected"

    if (leaveIndex === undefined || !status) {
      return NextResponse.json(
        { error: "Missing leaf pointer sequence fields" },
        { status: 400 }
      );
    }

    // 2. Safely find the professional profile document 
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 3. Make a structural copy of the embedded leaves array
    const structuralLeaves = [...(targetUser.leaves || [])];

    if (!structuralLeaves[leaveIndex]) {
      return NextResponse.json({ error: "Target leaves index out of bounds" }, { status: 400 });
    }

    // 4. Update the nested item status safely
    structuralLeaves[leaveIndex] = {
      ...structuralLeaves[leaveIndex],
      status: status, // Matches MongoDB title casing ("Approved" / "Rejected")
      updatedAt: new Date(),
    };

    // 5. Commit the array update back to the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        leaves: structuralLeaves,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("LEAVE_UPDATE_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to execute database profile write", details: error.message },
      { status: 500 }
    );
  }
}