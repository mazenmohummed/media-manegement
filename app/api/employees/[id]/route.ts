import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

// Update the type to remove 'leaves' from include since it's an embedded type
type EmployeeWithRelations = Prisma.UserGetPayload<{
  include: {
    tasks: { include: { project: true } };
    attendanceLogs: true;
    agency: true;
  };
}>;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

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
        agency: true,
      },
    }) as EmployeeWithRelations | null;

    if (!employee || employee.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Manual sort for embedded 'leaves' array
    const sortedLeaves = [...(employee.leaves || [])].sort((a, b) => 
      new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
    );

    const { password, ...userFields } = employee;

    const totalGrossGenerated = employee.tasks.reduce((sum, t) => sum + (t.grossRevenue || 0), 0);
    const totalMarginGenerated = employee.tasks.reduce((sum, t) => 
      sum + ((t.grossRevenue || 0) * ((t.margin || 0) / 100)), 0);

    return NextResponse.json({
      ...userFields,
      leaves: sortedLeaves,
      stats: {
        totalGrossGenerated,
        totalMarginGenerated,
        taskCount: employee.tasks.length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updateData: any = {
      name: body.name,
      email: body.email,
      role: body.role,
      userType: body.userType,
      salary: parseFloat(body.salary) || 0,
      verifiedSkills: Array.isArray(body.verifiedSkills) ? body.verifiedSkills : [],
    };

    if (body.password && body.password.trim() !== "") {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tasks: { 
          include: { project: true },
          orderBy: { startDate: 'desc' } 
        },
        attendanceLogs: { 
          take: 30, 
          orderBy: { date: 'desc' } 
        },
        // 'leaves' is NOT included here because it is an embedded field
      },
    });

    // Manual sort for embedded leaves after update
    const sortedLeaves = [...(updatedEmployee.leaves || [])].sort((a, b) => 
      new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
    );

    const { password, ...safeUpdatedData } = updatedEmployee;

    return NextResponse.json({
        ...safeUpdatedData,
        leaves: sortedLeaves
    });
  } catch (error) {
    console.error("UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}