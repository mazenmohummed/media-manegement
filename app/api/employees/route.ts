import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employees = await prisma.user.findMany({
      where: { agencyId: agencyId },
      include: {
        tasks: {
          select: {
            internalCost: true, // Updated from grossRevenue
            margin: true,
            status: true,
          }
        },
        attendanceLogs: {
          take: 10,
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { name: "asc" },
    });

    const formattedEmployees = employees.map((emp) => {
      // Calculate Revenue generated based on internalCost of completed tasks
      const totalRevenue = emp.tasks
        .filter((t) => t.status === "COMPLETED")
        .reduce((sum, t) => sum + (t.internalCost || 0), 0);

      // Profit Contribution: (Cost * Margin%)
      const profitContribution = emp.tasks
        .filter((t) => t.status === "COMPLETED")
        .reduce((sum, t) => sum + ((t.internalCost || 0) * ((t.margin || 0) / 100)), 0);

      return {
        ...emp,
        totalRevenue,
        profitContribution,
        // Using efficiencyRate from schema, or defaulting to 1.0
        efficiencyRate: emp.efficiencyRate || 1.0,
      };
    });

    // Global Agency Metrics
    const totalAgencyRevenue = formattedEmployees.reduce((acc, e) => acc + e.totalRevenue, 0);
    const totalAgencyProfit = formattedEmployees.reduce((acc, e) => acc + e.profitContribution, 0);

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: {
        totalRevenue: totalAgencyRevenue,
        totalProfit: totalAgencyProfit,
        employeeCount: formattedEmployees.length,
        avgEfficiency: (formattedEmployees.reduce((acc, e) => acc + e.efficiencyRate, 0) / formattedEmployees.length || 0).toFixed(2)
      }
    });

  } catch (error) {
    console.error("GET_EMPLOYEES_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, email, role, userType, password, salary, verifiedSkills } = body;

    // 1. SUBSCRIPTION LOCK: Check if they hit their max user limit
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { 
        subscription: true,
        _count: { select: { users: true } } 
      }
    });

    const maxUsers = agency?.subscription?.maxUsers || 5;
    if (agency && agency._count.users >= maxUsers) {
      return NextResponse.json({ 
        error: `Limit reached. Your ${agency.subscription?.plan} plan allows only ${maxUsers} users.` 
      }, { status: 403 });
    }

    // 2. EXISTENCE CHECK
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    // 3. SECURE CREATE
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
    return NextResponse.json(employeeData, { status: 201 });

  } catch (error: any) {
    console.error("POST_EMPLOYEE_ERROR:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}