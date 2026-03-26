import { NextResponse } from "next/server";
// Ensure this matches your lib file name and export
import prisma from "@/lib/prisma"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * GET /api/personnel
 */
export async function GET(req: Request) {
  try {
    // 1. Validate Prisma Instance
    if (!prisma) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    // 2. Safely check for session and agencyId
    if (!session || !session.user || !('agencyId' in session.user)) {
      return NextResponse.json({ error: "Unauthorized: Missing Agency ID" }, { status: 401 });
    }

    const agencyId = (session.user as any).agencyId;

    const employees = await prisma.user.findMany({
      where: { agencyId: agencyId },
      include: {
        tasks: {
          where: { status: "COMPLETED" },
          select: { grossRevenue: true }
        }
      }
    });

    // --- TRANSFORM DATA ---
    const formattedEmployees = employees.map((emp) => {
      const revenue = emp.tasks.reduce((sum, t) => sum + (t.grossRevenue || 0), 0);
      
      // logic: Freelancers cost 70% of revenue, staff use flat salary
      const cost = emp.userType === "FREELANCER" ? (revenue * 0.7) : (emp.salary || 0);
      
      // Calculate ROI (Return on Investment per employee)
      const roi = cost > 0 ? (revenue / cost).toFixed(2) : "0.00";

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role || "Team Member",
        userType: emp.userType,
        salary: emp.salary || 0,
        revenue: revenue,
        efficiency: `${roi}x`, // Formatted for your frontend .replace() logic
      };
    });

    // --- CALCULATE GLOBAL METRICS ---
    const totalRev = formattedEmployees.reduce((sum, e) => sum + e.revenue, 0);
    const totalCost = formattedEmployees.reduce((sum, e) => {
        // Recalculate cost for global efficiency
        return sum + (e.userType === "FREELANCER" ? e.revenue * 0.7 : e.salary);
    }, 0);

    const metrics = {
      avgRevenuePerHead: formattedEmployees.length > 0 ? totalRev / formattedEmployees.length : 0,
      globalEfficiency: totalCost > 0 ? (totalRev / totalCost).toFixed(2) : "0.00"
    };

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: metrics
    });

  } catch (error) {
    console.error("GET_FINANCE_DATA_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}