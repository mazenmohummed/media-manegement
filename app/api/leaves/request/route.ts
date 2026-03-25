import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma"; // Adjust this to your actual prisma client path
import { getServerSession } from "next-auth"; // Assumes you're using NextAuth for session management

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, type, reason } = await req.json();

    // Basic validation
    if (!startDate || !endDate || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update the user document by pushing a new leave object into the array
    const updatedUser = await prisma.user.update({
      where: { 
        email: session.user.email as string // Or use session.user.id if available
      },
      data: {
        leaves: {
          push: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            type: type, // e.g., "ANNUAL", "SICK", "EMERGENCY"
            status: "PENDING", // Default status for new requests
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