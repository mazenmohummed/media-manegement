import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;

    const employees = await prisma.user.findMany({
      where: { agencyId: agencyId },
      include: {
        tasks: {
          select: {
            grossRevenue: true,
            status: true,
            paymentStatus: true,
            // Removed dueDate to resolve the TypeScript error
          }
        },
        attendanceLogs: {
          take: 10, 
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET_EMPLOYEES_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, email, role, userType, agencyId, 
      verifiedSkills, password, salary 
    } = body;

    if (!name || !email || !agencyId || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        role, 
        userType,
        agencyId,
        password: hashedPassword,
        salary: parseFloat(salary) || 0,
        verifiedSkills: Array.isArray(verifiedSkills) ? verifiedSkills : [],
        efficiencyRate: 1.0, 
      },
    });

    const { password: _, ...employeeData } = newEmployee;

    // FIX: Add empty arrays so the frontend "tasks.filter" logic has data to work with
    return NextResponse.json({
      ...employeeData,
      tasks: [],
      attendanceLogs: []
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST_EMPLOYEE_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  }
}