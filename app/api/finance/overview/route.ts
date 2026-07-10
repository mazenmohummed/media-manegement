import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    // 1. Authenticate & Verify Tenant Multi-Tenancy
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Query Search Range Filters
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default Date Range Boundaries if not provided
    const dateQuery: any = {};
    if (startDateParam) dateQuery.gte = new Date(startDateParam);
    if (endDateParam) dateQuery.lte = new Date(endDateParam);

    const hasDateFilter = Object.keys(dateQuery).length > 0;

    // 3. Concurrent Database Queries execution for maximum performance
    const [agencyUsers, agencyProjects, agencyAssets, agencyExpenses, agencyPayouts] = await Promise.all([
      // A. Pull Active Staffing, Salaries, Ledger variations, and Embedded Leaves
      prisma.user.findMany({
        where: { agencyId },
        include: {
          financialLedger: {
            where: hasDateFilter ? { createdAt: dateQuery } : undefined,
          },
          payouts: {
            where: hasDateFilter ? { date: dateQuery } : undefined,
          },
        },
      }),

      // B. Pull Revenue Projects data along with scope task expenses
      prisma.project.findMany({
        where: {
          agencyId,
          ...(hasDateFilter ? { createdAt: dateQuery } : {}),
        },
        include: {
          taskExpenses: true,
        },
      }),

      // C. Aggregated Book Value Valuations of Assets
      prisma.asset.findMany({
        where: { agencyId },
      }),

      // D. Fixed Agency Overhead Operations
      prisma.expense.findMany({
        where: {
          agencyId,
          ...(hasDateFilter ? { date: dateQuery } : {}),
        },
      }),

      // E. Explicit Global Disbursements Breakdown
      prisma.payout.findMany({
        where: {
          agencyId,
          status: "PAID",
          ...(hasDateFilter ? { date: dateQuery } : {}),
        },
        include: {
          user: { select: { name: true } },
        },
      }),
    ]);

    // ─── 4. CALCULATE METRICS BREAKDOWN ────────────────────────────────────────

    // --- CLIENT & REVENUE STATS ---
    let totalInvoiced = 0;
    let totalReceived = 0;
    let totalDue = 0;
    let totalProjectProfitAmount = 0;
    const invoiceBreakdown: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      OVERDUE: 0,
      VOID: 0,
    };

    agencyProjects.forEach((proj) => {
      totalInvoiced += proj.totalValue;
      
      // Update Invoice Status Partition
      const statusKey = proj.invoiceStatus || "DRAFT";
      invoiceBreakdown[statusKey] = (invoiceBreakdown[statusKey] || 0) + proj.totalValue;

      // Handle Cash Collections vs Outstanding Receivables positions
      if (statusKey === "PAID") {
        totalReceived += proj.totalValue;
      } else if (statusKey === "PARTIALLY_PAID") {
        // Safe split: Assume 50% received for partials if no multi-payment table is aggregated
        totalReceived += proj.totalValue * 0.5;
        totalDue += proj.totalValue * 0.5;
      } else if (statusKey !== "VOID" && statusKey !== "DRAFT") {
        totalDue += proj.totalValue;
      }

      // Calculate Gross Profit margin metrics per Project profile scope
      const projectCost = proj.taskExpenses.reduce((sum, exp) => sum + exp.cost, 0);
      totalProjectProfitAmount += (proj.totalValue - projectCost);
    });

    const averageProjectProfit = agencyProjects.length > 0 
      ? totalProjectProfitAmount / agencyProjects.length 
      : 0;


    // --- EMPLOYEE STATS ---
    let monthlyPayroll = 0;
    let totalDisbursed = 0;
    let totalEfficiencySum = 0;
    const payoutBreakdown: Record<string, number> = {};
    
    // Track payouts per single staff identity to isolate Top Earner
    const staffEarningsTracker: Record<string, number> = {};

    agencyUsers.forEach((user) => {
      monthlyPayroll += user.baseSalary ?? 0;
      totalEfficiencySum += user.efficiencyRate ?? 1.0;
    });

    agencyPayouts.forEach((payout) => {
      totalDisbursed += payout.amount;
      
      // Breakdown by Payout Category (e.g. Salary, Bonus, Commission)
      const cat = payout.category || "Other";
      payoutBreakdown[cat] = (payoutBreakdown[cat] || 0) + payout.amount;

      // Map to identifying owner profile name
      const employeeName = payout.user?.name || "Unknown Staff";
      staffEarningsTracker[employeeName] = (staffEarningsTracker[employeeName] || 0) + payout.amount;
    });

    // Isolate Top Earner
    let topEarner: string | null = null;
    let maxEarning = 0;
    Object.entries(staffEarningsTracker).forEach(([name, amt]) => {
      if (amt > maxEarning) {
        maxEarning = amt;
        topEarner = name;
      }
    });

    const averageEfficiency = agencyUsers.length > 0 
      ? totalEfficiencySum / agencyUsers.length 
      : 1.0;


    // --- PRODUCTION EXPENSES & ASSETS ---
    const assetValuation = agencyAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    
    let rentalOutflow = 0;
    let totalProductionSpend = 0;
    const expenseCategoryBreakdown: Record<string, number> = {
      EQUIPMENT: 0,
      LOCATION: 0,
      TRANSPORT: 0,
      CATERING: 0,
      TALENT: 0,
      RENTAL: 0,
    };

    agencyProjects.forEach((proj) => {
      proj.taskExpenses.forEach((exp) => {
        totalProductionSpend += exp.cost;
        const cat = exp.category || "EQUIPMENT";
        expenseCategoryBreakdown[cat] = (expenseCategoryBreakdown[cat] || 0) + exp.cost;

        if (cat === "RENTAL") {
          rentalOutflow += exp.cost;
        }
      });
    });


    // --- OVERHEAD FIXED COSTS ---
    let fixedCosts = 0;
    const overheadBreakdown: Record<string, number> = {};

    agencyExpenses.forEach((exp) => {
      fixedCosts += exp.amount;
      const cat = exp.category || "General Operations";
      overheadBreakdown[cat] = (overheadBreakdown[cat] || 0) + exp.amount;
    });

    // Daily operational burn rate metrics based on days in period window
    let daysInPeriod = 30; // standard fallback defaults
    if (startDateParam && endDateParam) {
      const diffTime = Math.abs(new Date(endDateParam).getTime() - new Date(startDateParam).getTime());
      daysInPeriod = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
    }
    const burnRate = fixedCosts / daysInPeriod;


    // ─── 5. DISPATCH PAYLOAD COMPLIANT RESPONSE ────────────────────────────────
    return NextResponse.json({
      clientStats: {
        totalInvoiced,
        totalReceived,
        totalDue,
        averageProjectProfit,
        invoiceBreakdown,
      },
      employeeStats: {
        monthlyPayroll,
        totalDisbursed,
        averageEfficiency,
        topEarner,
        headCount: agencyUsers.length,
        payoutBreakdown,
      },
      equipmentStats: {
        assetValuation,
        rentalOutflow,
        totalProductionSpend,
        expenseCategoryBreakdown,
      },
      overhead: {
        fixedCosts,
        burnRate,
        overheadBreakdown,
      },
    });

  } catch (err) {
    console.error("[FINANCE_OVERVIEW_GET]", err);
    return NextResponse.json({ error: "Internal Fiscal Core Server Error" }, { status: 500 });
  }
}