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
          include: {
            taskExpenses: true, // Fetch expenses linked to tasks
          },
        },
        attendanceLogs: true, // Fetch all logs to calculate total hours
        payouts: true,        // Fetch payouts (bonuses, commissions, etc.)
      },
      orderBy: { name: "asc" },
    });

    const formattedEmployees = employees.map((emp) => {
      // 1. Calculate Revenue
      const totalRevenue = emp.tasks
        .filter((t) => t.status?.toUpperCase() === "COMPLETED") // Forces case-insensitive check
        .reduce((sum, t) => sum + (t.internalCost || 0), 0);

      // 2. Calculate Working Hours from AttendanceLogs
      const workingHours = emp.attendanceLogs.reduce(
        (acc, log) => acc + (log.totalHours || 0), 
        0
      );

      // 3. Calculate Extra Payouts (Bonuses/Commissions)
      const extraPayouts = emp.payouts.reduce(
        (acc, p) => acc + (p.amount || 0), 
        0
      );

      // 4. Calculate Task-based Expenses
      const expenses = emp.tasks.reduce((acc, t) => {
        const taskExpenseSum = (t.taskExpenses || []).reduce(
          (sum, exp) => sum + (exp.cost || 0), 
          0
        );
        return acc + taskExpenseSum;
      }, 0);

      // 5. Profit Contribution
      const profitContribution = emp.tasks
        .filter((t) => t.status === "COMPLETED")
        .reduce((sum, t) => sum + ((t.internalCost || 0) * ((t.margin || 0) / 100)), 0);

      // 6. Late Days Count
      const lateDays = emp.attendanceLogs.filter(log => log.isLate).length;

      return {
        ...emp,
        totalRevenue,
        profitContribution,
        workingHours: parseFloat(workingHours.toFixed(1)),
        extraPayouts,
        expenses,
        lateDays,
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