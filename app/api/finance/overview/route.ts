// app/api/finance/overview/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const agencyId = session.user.agencyId;

  try {
    // Fetch all data in parallel for performance
    const [projects, payments, users, payouts, assets, taskExpenses, expenses] =
      await Promise.all([
        // Projects = invoices (totalValue is the invoice amount)
        prisma.project.findMany({
          where: { agencyId },
          select: {
            totalValue: true,
            invoiceStatus: true,
            tasks: {
              select: {
                taskNetProfit: true,
                internalCost: true,
                realCost: true,
              },
            },
          },
        }),

        // Payments = cash actually received from clients
        prisma.payment.findMany({
          where: { agencyId },
          select: { amount: true, datePaid: true },
        }),

        // Users = salary-based payroll
        prisma.user.findMany({
          where: { agencyId },
          select: {
            id: true,
            name: true,
            salary: true,
            efficiencyRate: true,
            userType: true,
          },
        }),

        // Payouts = actual disbursements (salaries, bonuses, commissions)
        prisma.payout.findMany({
          where: { agencyId },
          select: { amount: true, category: true, date: true },
        }),

        // Assets = equipment owned
        prisma.asset.findMany({
          where: { agencyId },
          select: { currentValue: true, category: true },
        }),

        // TaskExpenses = external rentals & production costs
        prisma.taskExpense.findMany({
          where: { agencyId },
          select: { cost: true, category: true },
        }),

        // Expenses = agency overhead (fixed operational costs)
        prisma.expense.findMany({
          where: { agencyId },
          select: { amount: true, category: true, date: true, status: true },
        }),
      ]);

    // ─────────────────────────────────────────────────────────────
    // CLIENT STATS
    // ─────────────────────────────────────────────────────────────

    const totalInvoiced = projects.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);

    const totalReceived = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    // Amount billed but not yet paid
    const totalDue = totalInvoiced - totalReceived;

    // Net profit across all tasks
    const allTaskProfits = projects.flatMap((p) =>
      p.tasks.map((t) => t.taskNetProfit ?? 0)
    );
    const averageProjectProfit =
      allTaskProfits.length > 0
        ? allTaskProfits.reduce((s, v) => s + v, 0) / allTaskProfits.length
        : 0;

    // Invoice status breakdown (useful for the UI waterfall)
    const invoiceBreakdown = projects.reduce(
      (acc, p) => {
        const status = p.invoiceStatus ?? "DRAFT";
        acc[status] = (acc[status] ?? 0) + (p.totalValue ?? 0);
        return acc;
      },
      {} as Record<string, number>
    );

    // ─────────────────────────────────────────────────────────────
    // EMPLOYEE / PAYROLL STATS
    // ─────────────────────────────────────────────────────────────

    // Monthly payroll = sum of all user salaries (stored as monthly)
    const monthlyPayroll = users.reduce((sum, u) => sum + (u.salary ?? 0), 0);

    // Total disbursed (actual payouts sent out)
    const totalDisbursed = payouts.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    // Average efficiency rate across staff
    const avgEfficiency =
      users.length > 0
        ? users.reduce((sum, u) => sum + (u.efficiencyRate ?? 1), 0) / users.length
        : 1;

    // Top earner = highest salary user (proxy for biggest contributor)
    const topEarnerUser = users.reduce(
      (top, u) => ((u.salary ?? 0) > (top?.salary ?? 0) ? u : top),
      users[0] ?? null
    );

    // Payroll breakdown by category (Salary vs Bonus vs Commission)
    const payoutBreakdown = payouts.reduce(
      (acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + p.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    // ─────────────────────────────────────────────────────────────
    // EQUIPMENT / ASSET STATS
    // ─────────────────────────────────────────────────────────────

    // Total book value of owned assets
    const assetValuation = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

    // External rental outflow from task production expenses
    const rentalOutflow = taskExpenses
      .filter((e) => e.category === "EQUIPMENT" || e.category === "RENTAL")
      .reduce((sum, e) => sum + (e.cost ?? 0), 0);

    // All task expense outflow (full production cost)
    const totalProductionSpend = taskExpenses.reduce(
      (sum, e) => sum + (e.cost ?? 0),
      0
    );

    // Breakdown by category
    const expenseCategoryBreakdown = taskExpenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.cost;
        return acc;
      },
      {} as Record<string, number>
    );

    // ─────────────────────────────────────────────────────────────
    // OVERHEAD / FIXED COSTS
    // ─────────────────────────────────────────────────────────────

    // Fixed agency overhead (from Expense model)
    const fixedCosts = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    // Daily burn rate = fixed monthly costs / 30
    const burnRate = fixedCosts / 30;

    // Overhead by category
    const overheadBreakdown = expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    // ─────────────────────────────────────────────────────────────
    // RETURN STRUCTURED RESPONSE
    // ─────────────────────────────────────────────────────────────

    return NextResponse.json({
      clientStats: {
        totalInvoiced,        // Total value of all projects billed
        totalReceived,        // Cash in the door from payments
        totalDue,             // Outstanding receivables
        averageProjectProfit, // Avg net profit per task
        invoiceBreakdown,     // { DRAFT, SENT, PAID, OVERDUE, ... }
      },

      employeeStats: {
        monthlyPayroll,       // Sum of all staff salaries
        totalDisbursed,       // Total payouts actually sent
        averageEfficiency: Number(avgEfficiency.toFixed(2)),
        topEarner: topEarnerUser?.name ?? null,
        headCount: users.length,
        payoutBreakdown,      // { Salary, Bonus, Commission }
      },

      equipmentStats: {
        assetValuation,           // Total book value of owned assets
        rentalOutflow,            // External rental spend
        totalProductionSpend,     // All task-level expenses
        expenseCategoryBreakdown, // { EQUIPMENT, LOCATION, TRANSPORT, ... }
      },

      overhead: {
        fixedCosts,        // Total agency expenses
        burnRate,          // Daily burn (fixedCosts / 30)
        overheadBreakdown, // Broken down by expense category
      },
    });
  } catch (error) {
    console.error("FINANCE_OVERVIEW_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load financial data" },
      { status: 500 }
    );
  }
}