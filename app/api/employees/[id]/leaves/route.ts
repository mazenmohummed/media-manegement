import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// POST: Request a new leave period (appends to embedded array)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id } = await params;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { startDate, endDate, type } = body;

    // Verify employee ownership
    const employee = await prisma.user.findFirst({
      where: { id, agencyId }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Since leaves are embedded inside the User document in MongoDB, we push directly to the field array
    const newLeave = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      status: "Pending", // Default initial state
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: {
        leaves: {
          push: newLeave
        }
      }
    });

    return NextResponse.json({ message: "Leave requested successfully", leaves: updatedEmployee.leaves });
  } catch (error) {
    console.error("CREATE_LEAVE_ERROR:", error);
    return NextResponse.json({ error: "Failed to request leave" }, { status: 500 });
  }
}

// PUT: Update an embedded leave entry (Handles Date changes, Type updates, and Admin Approvals/Rejections)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    // Optional: Extract requester role if you want to explicitly restrict non-admins from updating state
    // const userRole = session?.user?.role; 

    const { id } = await params;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    // targetStartDate acts as our composite locator matching our embedded item index
    const { targetStartDate, startDate, endDate, type, status } = body;

    if (!targetStartDate) {
      return NextResponse.json({ error: "Missing targeting locator (targetStartDate)" }, { status: 400 });
    }

    const employee = await prisma.user.findFirst({
      where: { id, agencyId }
    });

    if (!employee || !employee.leaves) {
      return NextResponse.json({ error: "Employee or leaves ledger not found" }, { status: 404 });
    }

    // Optional Guard: If an identity check is needed to ensure only valid roles perform status modifications
    // if (status && status !== "Pending" && userRole !== "ADMIN") {
    //   return NextResponse.json({ error: "Forbidden: Only administrators can alter request status" }, { status: 403 });
    // }

    let targetFound = false;

    // Map through array to find and modify the target item
    const updatedLeaves = employee.leaves.map((leave: any) => {
      const isMatch = new Date(leave.startDate).toISOString() === new Date(targetStartDate).toISOString();
      if (isMatch) {
        targetFound = true;
        return {
          ...leave,
          startDate: startDate ? new Date(startDate) : leave.startDate,
          endDate: endDate ? new Date(endDate) : leave.endDate,
          type: type || leave.type,
          status: status || leave.status, // Assigns "Approved", "Rejected", or falls back
          updatedAt: new Date()
        };
      }
      return leave;
    });

    if (!targetFound) {
      return NextResponse.json({ error: "Specific leave target record not found" }, { status: 404 });
    }

    // Save the entire updated array back to the parent Document
    await prisma.user.update({
      where: { id },
      data: {
        leaves: updatedLeaves
      }
    });

    return NextResponse.json({ 
      message: status ? `Leave request status marked as ${status}` : "Leave record updated successfully", 
      leaves: updatedLeaves 
    });
  } catch (error) {
    console.error("UPDATE_LEAVE_ERROR:", error);
    return NextResponse.json({ error: "Failed to update leave record" }, { status: 500 });
  }
}