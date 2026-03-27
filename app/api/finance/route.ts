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

    // 1. FETCH: Only users and tasks belonging to THIS agency
    const employees = await prisma.user.findMany({
      where: { agencyId },
      include: {
        tasks: {
          where: { 
            status: "COMPLETED", 
            agencyId 
          },
          select: {
            internalCost: true, // Updated from grossRevenue
            margin: true,       // Added to calculate true profit
          },
        },
      },
    });

    // 2. TRANSFORM: Individual Performance Metrics
    const formattedEmployees = employees.map((emp) => {
      const completedTasks = emp.tasks;

      // Revenue generated (Base work value)
      const totalRevenue = completedTasks.reduce(
        (sum, t) => sum + (Number(t.internalCost) || 0), 0
      );

      // Profit generated (InternalCost * Margin%)
      const totalProfit = completedTasks.reduce((sum, t) => {
        const cost = Number(t.internalCost) || 0;
        const margin = Number(t.margin) || 0;
        return sum + (cost * (margin / 100));
      }, 0);

      /**
       * ROI LOGIC:
       * For Staff: (Profit / Salary) -> How many times they pay for themselves.
       * For Freelancers: (Profit / 1) -> Since they are variable cost, we track pure profit.
       */
      const costBasis = emp.userType === "FREELANCER" ? 1 : (Number(emp.salary) || 1);
      const efficiency = (totalProfit / costBasis).toFixed(2);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        userType: emp.userType,
        salary: emp.salary || 0,
        totalRevenue,
        totalProfit,
        efficiencyRate: efficiency,
      };
    });

    // 3. GLOBAL METRICS
    const totalAgencyRevenue = formattedEmployees.reduce((sum, e) => sum + e.totalRevenue, 0);
    const totalAgencyProfit = formattedEmployees.reduce((sum, e) => sum + e.totalProfit, 0);
    const totalSalaryLiability = formattedEmployees
      .filter(e => e.userType !== "FREELANCER")
      .reduce((sum, e) => sum + e.salary, 0);

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: {
        totalRevenue: totalAgencyRevenue,
        totalProfit: totalAgencyProfit,
        avgProfitPerHead: totalAgencyProfit / (employees.length || 1),
        salaryToProfitRatio: totalSalaryLiability > 0 
          ? (totalAgencyProfit / totalSalaryLiability).toFixed(2) 
          : "0.00",
        teamSize: employees.length
      },
    });

  } catch (error) {
    console.error("PERSONNEL_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}