import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { agencyId },
      include: {
        tasks: {
          include: {
            taskExpenses: true,
          },
        },
        attendanceLogs: true,
        payouts: true,
      },
      orderBy: { name: "asc" },
    });

    const formattedEmployees = users.map((u: any) => {
      // Normalize payroll fields (support older 'salary' field if present)
      const baseSalary = typeof u.baseSalary === "number"
        ? u.baseSalary
        : typeof u.salary === "number"
          ? u.salary
          : 0;

      const walletBalance = typeof u.walletBalance === "number"
        ? u.walletBalance
        : (u.userType === "FREELANCER" && typeof u.salary === "number")
          ? u.salary
          : 0;

      // 1. Calculate Revenue (sum of internalCost for completed tasks)
      const totalRevenue = (u.tasks || [])
        .filter((t: any) => (t.status || "").toString().toUpperCase() === "COMPLETED")
        .reduce((sum: number, t: any) => sum + (t.internalCost || 0), 0);

      // 2. Calculate Working Hours from AttendanceLogs
      const workingHours = (u.attendanceLogs || []).reduce((acc: number, log: any) => acc + (log.totalHours || 0), 0);

      // 3. Calculate Extra Payouts (Bonuses/Commissions)
      const extraPayouts = (u.payouts || []).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

      // 4. Calculate Task-based Expenses
      const expenses = (u.tasks || []).reduce((acc: number, t: any) => {
        const taskExpenseSum = (t.taskExpenses || []).reduce((s: number, exp: any) => s + (exp.cost || 0), 0);
        return acc + taskExpenseSum;
      }, 0);

      // 5. Profit Contribution (margin amount)
      const profitContribution = (u.tasks || [])
        .filter((t: any) => (t.status || "").toString().toUpperCase() === "COMPLETED")
        .reduce((sum: number, t: any) => sum + ((t.internalCost || 0) * ((t.margin || 0) / 100)), 0);

      // 6. Late Days Count
      const lateDays = (u.attendanceLogs || []).filter((log: any) => log.isLate).length;

      // Build sanitized employee payload (avoid returning password and other sensitive/internal props)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        userType: u.userType,
        verifiedSkills: u.verifiedSkills || [],
        efficiencyRate: u.efficiencyRate ?? 1.0,
        baseSalary,
        walletBalance,
        tasks: u.tasks || [],
        attendanceLogs: u.attendanceLogs || [],
        payouts: u.payouts || [],
        // computed fields
        totalRevenue,
        profitContribution,
        workingHours: parseFloat((workingHours).toFixed(1)),
        extraPayouts,
        expenses,
        lateDays,
      };
    });

    // Global Agency Metrics
    const totalAgencyRevenue = formattedEmployees.reduce((acc, e) => acc + (e.totalRevenue || 0), 0);
    const totalAgencyProfit = formattedEmployees.reduce((acc, e) => acc + (e.profitContribution || 0), 0);
    const avgEfficiency = formattedEmployees.length > 0
      ? (formattedEmployees.reduce((acc, e) => acc + (e.efficiencyRate || 0), 0) / formattedEmployees.length)
      : 0;

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: {
        totalRevenue: totalAgencyRevenue,
        totalProfit: totalAgencyProfit,
        employeeCount: formattedEmployees.length,
        avgEfficiency: avgEfficiency.toFixed(2),
      },
    });
  } catch (error) {
    console.error("GET_EMPLOYEES_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;

    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name,
      email,
      role,
      userType,
      password,
      // accept either baseSalary (new) or salary (legacy)
      baseSalary: baseSalaryIn,
      salary: legacySalary,
      verifiedSkills,
    } = body;

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields (name, email, password)" }, { status: 400 });
    }

    // Subscription lock: check max users
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { subscription: true, _count: { select: { users: true } } },
    });

    const maxUsers = (agency?.subscription?.maxUsers) ?? 5;
    if (agency && agency._count && agency._count.users >= maxUsers) {
      return NextResponse.json({
        error: `Limit reached. Your ${agency.subscription?.plan ?? "plan"} allows only ${maxUsers} users.`,
      }, { status: 403 });
    }

    // Existence check
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    // Create user: prefer baseSalary, fallback to legacy salary if provided
    const baseSalaryValue = parseFloat(String(baseSalaryIn ?? legacySalary ?? 0)) || 0;

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        role,
        userType,
        agencyId,
        password: hashedPassword,
        baseSalary: baseSalaryValue,
        // walletBalance will default to 0 (no need to set)
        verifiedSkills: Array.isArray(verifiedSkills) ? verifiedSkills : [],
        efficiencyRate: 1.0,
      },
    });

    // sanitize response
    const { password: _pw, ...employeeData } = created as any;

    // Return normalized shape for client
    const response = {
      id: employeeData.id,
      name: employeeData.name,
      email: employeeData.email,
      role: employeeData.role,
      userType: employeeData.userType,
      verifiedSkills: employeeData.verifiedSkills || [],
      baseSalary: employeeData.baseSalary ?? 0,
      walletBalance: employeeData.walletBalance ?? 0,
      efficiencyRate: employeeData.efficiencyRate ?? 1.0,
      createdAt: employeeData.createdAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("POST_EMPLOYEE_ERROR:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}