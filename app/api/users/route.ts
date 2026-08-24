import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withAuthGuard } from "@/lib/auth/guard";
import { checkQuotaGuard } from "@/lib/auth/subscriptionGuard";
import { getScopedPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ─── GET /api/users ───────────────────────────────────────────────────────
export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    // Lightweight search mode — explicitly typed as UserRole[] to satisfy Prisma
    const ASSIGNABLE_ROLES: UserRole[] = ["ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"];

    if (q !== null) {
      const users = await db.user.findMany({
        where: {
          isActive: true,
          role: { in: ASSIGNABLE_ROLES },
          ...(q.trim()
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        orderBy: { name: "asc" },
        take: 20,
      });

      return NextResponse.json({ users });
    }

    // ── Full HR dashboard logic ──
    const users = await db.user.findMany({
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            internalCost: true,
            marginAmount: true,
            totalInvoice: true,
            taskType: true,
            paymentStatus: true,
          },
        },
        attendanceLogs: {
          select: {
            id: true,
            checkInTime: true,
            checkOutTime: true,
            totalHours: true,
            isLate: true,
            type: true,
            date: true,
          },
        },
        payouts: {
          select: { id: true, amount: true, category: true, status: true, date: true },
        },
        financialLedger: {
          select: { id: true, type: true, amount: true, status: true, createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    });

    let upcomingPending = 0;
    let upcomingPartial = 0;

    const employees = users.map((u) => {
      const baseSalary = u.baseSalary ?? 0;
      const walletBalance = u.walletBalance ?? 0;

      const completedTasks = u.tasks.filter(
        (t) => t.status?.trim().toUpperCase() === "COMPLETED"
      );

      const totalRevenue = completedTasks.reduce(
        (s, t) => s + (t.totalInvoice ?? t.internalCost ?? 0),
        0
      );
      const profitContribution = completedTasks.reduce(
        (s, t) => s + (t.marginAmount ?? 0),
        0
      );

      const totalWorkingHours = u.attendanceLogs.reduce(
        (s, l) => s + (l.totalHours ?? 0),
        0
      );
      const lateCount = u.attendanceLogs.filter((l) => l.isLate).length;
      const totalPayouts = u.payouts.reduce((s, p) => s + p.amount, 0);
      const ledgerTotal = u.financialLedger.reduce((s, t) => s + t.amount, 0);

      const commissions = u.financialLedger
        .filter((t) => t.type === "COMMISSION" && t.status !== "CANCELLED")
        .reduce((s, t) => s + t.amount, 0);

      const overtime = u.financialLedger
        .filter((t) => t.type === "OVERTIME" && t.status !== "CANCELLED")
        .reduce((s, t) => s + t.amount, 0);

      const deductions = u.financialLedger
        .filter((t) => t.amount < 0 && t.status !== "CANCELLED")
        .reduce((s, t) => s + t.amount, 0);

      u.tasks.forEach((t) => {
        const taskStatus = t.status?.trim().toUpperCase();
        const payStatus = t.paymentStatus?.trim().toUpperCase();

        if (
          taskStatus !== "COMPLETED" ||
          payStatus === "PENDING" ||
          payStatus === "PARTIAL"
        ) {
          const value = t.totalInvoice ?? t.internalCost ?? 0;
          if (payStatus === "PARTIAL") {
            upcomingPartial += value;
          } else {
            upcomingPending += value;
          }
        }
      });

      const todayStr = new Date().toISOString().split("T")[0];
      const isCheckedInToday = u.attendanceLogs.some((l) => {
        const logDate = new Date(l.checkInTime).toISOString().split("T")[0];
        return logDate === todayStr && !l.checkOutTime;
      });

      const { password: _pw, ...safeUser } = u as any;

      return {
        ...safeUser,
        baseSalary,
        walletBalance,
        commissions: parseFloat(commissions.toFixed(2)),
        overtime: parseFloat(overtime.toFixed(2)),
        deductions: parseFloat(Math.abs(deductions).toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        profitContribution: parseFloat(profitContribution.toFixed(2)),
        totalWorkingHours: parseFloat(totalWorkingHours.toFixed(1)),
        lateCount,
        totalPayouts: parseFloat(totalPayouts.toFixed(2)),
        ledgerTotal: parseFloat(ledgerTotal.toFixed(2)),
        isCheckedInToday,
        tasksCount: u.tasks.length,
        completedTasksCount: completedTasks.length,
        activeTasksCount: u.tasks.filter((t) => {
          const s = t.status?.trim().toUpperCase();
          return s === "ACTIVE" || s === "IN_PROGRESS";
        }).length,
      };
    });

    const totalRevenueSum = employees.reduce((s, e) => s + e.totalRevenue, 0);
    const totalProfitSum = employees.reduce((s, e) => s + e.profitContribution, 0);
    const totalPayrollSum = employees.reduce((s, e) => s + (e.baseSalary ?? 0), 0);
    const totalWalletSum = employees.reduce((s, e) => s + (e.walletBalance ?? 0), 0);
    const avgEfficiency =
      employees.length > 0
        ? employees.reduce((s, e) => s + (e.efficiencyRate ?? 1), 0) /
          employees.length
        : 1;

    return NextResponse.json({
      employees,
      metrics: {
        employeeCount: employees.length,
        totalRevenue: parseFloat(totalRevenueSum.toFixed(2)),
        totalProfit: parseFloat(totalProfitSum.toFixed(2)),
        totalPayroll: parseFloat(totalPayrollSum.toFixed(2)),
        totalWallet: parseFloat(totalWalletSum.toFixed(2)),
        avgEfficiency: parseFloat(avgEfficiency.toFixed(2)),
        checkedInToday: employees.filter((e) => e.isCheckedInToday).length,
        upcomingRevenue: parseFloat(
          (upcomingPending + upcomingPartial).toFixed(2)
        ),
        upcomingRevenueBreakdown: {
          pending: parseFloat(upcomingPending.toFixed(2)),
          partiallyPaid: parseFloat(upcomingPartial.toFixed(2)),
        },
      },
    });
  } catch (err) {
    console.error("[EMPLOYEES_GET]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────
export const POST = withAuthGuard("user:create", async (req, { agencyId }) => {
  try {
    const quotaCheck = await checkQuotaGuard(agencyId, "users");
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.error,
          code: "PLAN_LIMIT_REACHED",
          meta: {
            resource: "users",
            currentPlan: quotaCheck.plan,
            limit: quotaCheck.limit,
            currentCount: quotaCheck.currentCount,
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, userType, baseSalary, verifiedSkills } =
      body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    const exists = await db.user.findFirst({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const created = await db.user.create({
      data: {
        agencyId,
        name,
        email,
        password: hashed,
        role: role ?? "CREATIVE",
        userType: userType ?? "FULL_TIME",
        baseSalary: parseFloat(String(baseSalary ?? 0)) || 0,
        walletBalance: 0,
        efficiencyRate: 1.0,
        verifiedSkills: Array.isArray(verifiedSkills) ? verifiedSkills : [],
      },
    });

    const { password: _pw, ...safe } = created as any;
    return NextResponse.json(safe, { status: 201 });
  } catch (err: any) {
    console.error("[EMPLOYEES_POST]", err);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
});