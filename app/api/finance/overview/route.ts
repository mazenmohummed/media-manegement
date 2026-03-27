import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. FETCH: Combined Agency Partition Data
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        projects: {
          where: { agencyId },
          select: { totalValue: true, invoiceStatus: true }
        },
        users: {
          where: { agencyId },
          select: { name: true, salary: true, efficiencyRate: true }
        },
        assets: {
          where: { agencyId },
          select: { currentValue: true }
        },
        expenses: {
          where: { agencyId },
          select: { amount: true, category: true }
        },
      },
    });

    if (!agency) return NextResponse.json({ error: "Agency workspace not found" }, { status: 404 });

    // 2. Client Partition: Revenue & Due
    const totalInvoiced = agency.projects.reduce((sum, p) => sum + (Number(p.totalValue) || 0), 0);
    const totalDue = agency.projects
      .filter((p) => p.invoiceStatus !== "PAID")
      .reduce((sum, p) => sum + (Number(p.totalValue) || 0), 0);

    // 3. Employee Partition: Payroll & Efficiency
    const monthlyPayroll = agency.users.reduce((sum, u) => sum + (Number(u.salary) || 0), 0);
    const avgEfficiency = agency.users.length 
      ? agency.users.reduce((sum, u) => sum + (Number(u.efficiencyRate) || 0), 0) / agency.users.length 
      : 0;

    // 4. Task Expenses Partition (Equipment Rentals, Travel, etc.)
    const taskExpenses = await prisma.taskExpense.aggregate({
      where: { agencyId },
      _sum: { cost: true },
    });
    
    const assetValuation = agency.assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

    // 5. Overhead: Infrastructure & Daily Burn
    const fixedCosts = agency.expenses
      .filter(e => ["Infrastructure", "Software", "Utilities", "Rent"].includes(e.category))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalMonthlyOutflow = monthlyPayroll + fixedCosts;
    const projectExpenses = taskExpenses._sum.cost || 0;

    // 6. Net Financial Health
    const netProfit = totalInvoiced - (totalMonthlyOutflow + projectExpenses);

    return NextResponse.json({
      clientStats: {
        totalDue,
        totalInvoiced,
        averageProjectValue: totalInvoiced / (agency.projects.length || 1),
      },
      employeeStats: {
        monthlyPayroll,
        averageEfficiency: avgEfficiency.toFixed(2),
        topEarner: [...agency.users].sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0))[0]?.name || "N/A",
      },
      productionStats: {
        taskExpenseOutflow: projectExpenses,
        assetValuation,
      },
      overhead: {
        fixedCosts,
        burnRate: (totalMonthlyOutflow / 30).toFixed(2), // Daily Burn
        netProfit: netProfit.toFixed(2),
        marginStatus: netProfit > 0 ? "HEALTHY" : "CRITICAL"
      },
    });
  } catch (error) {
    console.error("FINANCIAL_STATS_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch financials" }, { status: 500 });
  }
}