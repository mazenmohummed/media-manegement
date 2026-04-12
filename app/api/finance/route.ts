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

    // 1. FETCH: Personnel and their completed tasks
    const employees = await prisma.user.findMany({
      where: { agencyId },
      include: {
        tasks: {
          where: { 
            status: "COMPLETED", 
            agencyId 
          },
          select: {
            internalCost: true, 
            margin: true, 
          },
        },
      },
    });

    // 2. TRANSFORM: Process individual performance data
    const formattedEmployees = employees.map((emp) => {
      const completedTasks = emp.tasks;

      // Base work value (Revenue)
      const totalRevenue = completedTasks.reduce(
        (sum, t) => sum + (Number(t.internalCost) || 0), 0
      );

      // Profit generated based on cost * margin percentage
      const totalProfit = completedTasks.reduce((sum, t) => {
        const cost = Number(t.internalCost) || 0;
        const margin = Number(t.margin) || 0;
        return sum + (cost * (margin / 100));
      }, 0);

      // ROI calculation: (Profit / Salary)
      const costBasis = emp.userType === "FREELANCER" ? 1 : (Number(emp.salary) || 1);
      const efficiency = (totalProfit / costBasis).toFixed(2);

      return {
        id: emp.id,
        name: emp.name,
        totalRevenue,
        totalProfit,
        salary: Number(emp.salary) || 0,
        userType: emp.userType,
        efficiencyRate: efficiency,
      };
    });

    // 3. AGGREGATE: Global Agency Metrics
    const totalAgencyRevenue = formattedEmployees.reduce((sum, e) => sum + e.totalRevenue, 0);
    const totalAgencyProfit = formattedEmployees.reduce((sum, e) => sum + e.totalProfit, 0);
    
    const totalSalaryLiability = formattedEmployees
      .filter(e => e.userType !== "FREELANCER")
      .reduce((sum, e) => sum + e.salary, 0);

    const topEarner = [...formattedEmployees].sort((a, b) => b.totalProfit - a.totalProfit)[0]?.name || "N/A";

    // 4. RESPONSE: Final mapping to match the Frontend structure
    return NextResponse.json({
      clientStats: {
        totalInvoiced: totalAgencyRevenue,
        totalDue: totalAgencyRevenue * 0.15, // Placeholder: 15% pending
        averageProjectProfit: totalAgencyProfit / (employees.length || 1),
      },
      employeeStats: {
        monthlyPayroll: totalSalaryLiability,
        averageEfficiency: totalSalaryLiability > 0 
          ? (totalAgencyProfit / totalSalaryLiability).toFixed(1) 
          : "0.0",
        topEarner: topEarner,
      },
      equipmentStats: {
        rentalOutflow: 0, // Placeholder for future equipment logic
        assetValuation: 0,
      },
      overhead: {
        fixedCosts: 1500, // Static placeholder
        burnRate: 1500 / 30,
      },
      // Keep the raw list for tables or detailed lists
      employees: formattedEmployees 
    });

  } catch (error: any) {
    console.error("FINANCE_OVERVIEW_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}