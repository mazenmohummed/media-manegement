import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id } = await params;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { project: true },
          orderBy: { startDate: "desc" },
        },
        attendanceLogs: {
          take: 30,
          orderBy: { date: "desc" },
        },
        // REMOVED: Nested orderBy from embedded collection to prevent Prisma validation runtime panic
        agency: true,
      },
    });

    if (!employee || employee.agencyId !== agencyId) {
      return NextResponse.json({ error: "Employee not found in your workspace" }, { status: 404 });
    }

    // Safely sort embedded leaf entries in memory instead
    const sortedLeaves = employee.leaves 
      ? [...employee.leaves].sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      : [];

    // Server-Side calculated metrics based on your actual Schema fields
    const totalGrossRevenue = employee.tasks.reduce((sum, t) => sum + (t.internalCost || 0), 0);

    // Net Agency Profit: Summing up your pre-calculated marginAmount or taskNetProfit
    const totalMarginValue = employee.tasks.reduce((sum, t) => sum + (t.marginAmount || 0), 0);

    const { password, leaves, ...userFields } = employee;

    return NextResponse.json({
      ...userFields,
      leaves: sortedLeaves, // Return the cleanly ordered leaves array here
      stats: {
        totalGrossRevenue,
        totalMarginValue,
        taskCount: employee.tasks.length,
        efficiencyRate: employee.efficiencyRate || 1.0
      },
    });
  } catch (error) {
    console.error("GET_EMPLOYEE_DETAIL_ERROR:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// PUT: Update employee details with proper data casting
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id } = await params;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Verify ownership
    const existingEmployee = await prisma.user.findFirst({
      where: { id, agencyId }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Unauthorized update attempt" }, { status: 403 });
    }

    // 2. Prepare Update Object
    const updateData: any = {
      name: body.name,
      email: body.email,
      role: body.role,
      userType: body.userType,
      // FIX: Wrap inside Math.abs to strip out explicit or accidental negative numbers on manual input updates
      salary: Math.abs(parseFloat(body.salary) || 0),
      efficiencyRate: parseFloat(body.efficiencyRate) || 1.0,
      verifiedSkills: Array.isArray(body.verifiedSkills) ? body.verifiedSkills : [],
    };

    if (body.password && body.password.trim() !== "") {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password, ...safeData } = updatedEmployee;
    return NextResponse.json(safeData);
  } catch (error) {
    console.error("UPDATE_EMPLOYEE_ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE: Terminate employee
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id } = await params;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.id === id) return NextResponse.json({ error: "Self-termination forbidden" }, { status: 400 });

    const deleted = await prisma.user.deleteMany({
      where: { id, agencyId },
    });

    if (deleted.count === 0) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    return NextResponse.json({ message: "Employee removed from agency successfully" });
  } catch (error) {
    console.error("DELETE_EMPLOYEE_ERROR:", error);
    return NextResponse.json({ error: "Termination failed" }, { status: 500 });
  }
}