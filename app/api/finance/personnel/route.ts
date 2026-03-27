import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    
    // 1. SECURITY: Strict agency wall
    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. FETCH: Scoped data
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
            margin: true
          }
        }
      }
    });

    // 3. TRANSFORM: Logic for ROI & Performance
    const formattedEmployees = employees.map((emp) => {
      const completedTasks = emp.tasks;

      // Revenue generated (The Base Value of work performed)
      const totalTaskRevenue = completedTasks.reduce(
        (sum, t) => sum + (Number(t.internalCost) || 0), 0
      );

      // Profit contribution based on your schema's margin %
      const totalProfitContribution = completedTasks.reduce((sum, t) => {
        const cost = Number(t.internalCost) || 0;
        const marginPercent = Number(t.margin) || 0;
        return sum + (cost * (marginPercent / 100));
      }, 0);

      /**
       * ROI Logic:
       * - Freelancer: Cost is the internalCost (assuming revenue share)
       * - Full-time/Intern: Cost is their fixed monthly salary
       */
      const productionCost = emp.userType === "FREELANCER" 
        ? totalTaskRevenue 
        : (Number(emp.salary) || 0);

      // Efficiency: Revenue generated per unit of cost
      const efficiency = productionCost > 0 
        ? (totalTaskRevenue / productionCost).toFixed(2) 
        : "0.00";

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        userType: emp.userType,
        totalTaskRevenue,
        totalProfitContribution,
        efficiencyRate: efficiency,
        salary: emp.salary || 0,
      };
    });

    // 4. GLOBAL METRICS
    const totalAgencyRevenue = formattedEmployees.reduce((sum, e) => sum + e.totalTaskRevenue, 0);
    const totalAgencyProfit = formattedEmployees.reduce((sum, e) => sum + e.totalProfitContribution, 0);
    
    // Total Liability = Sum of all Salaries + Freelancer payouts
    const totalLiability = formattedEmployees.reduce((sum, e) => {
        return sum + (e.userType === "FREELANCER" ? e.totalTaskRevenue : e.salary);
    }, 0);

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: {
        totalRevenue: totalAgencyRevenue,
        totalProfit: totalAgencyProfit,
        globalROI: totalLiability > 0 ? (totalAgencyRevenue / totalLiability).toFixed(2) : "0.00",
        employeeCount: formattedEmployees.length
      }
    });

  } catch (error) {
    console.error("GET_FINANCE_METRICS_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}