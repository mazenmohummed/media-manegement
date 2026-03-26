import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Ensure this matches your prisma instance path
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;

    // Fetch employees with their associated tasks (to calculate revenue)
    const employees = await prisma.user.findMany({
      where: { agencyId },
      include: {
        tasks: {
          select: {
            grossRevenue: true,
          },
        },
      },
    });

    // Transform data for the frontend
    const formattedEmployees = employees.map((emp) => {
      const totalTaskRevenue = emp.tasks.reduce((sum, t) => sum + (t.grossRevenue || 0), 0);
      
      // Basic ROI Calculation: Revenue / (Salary or 1 if 0 to avoid Infinity)
      const cost = emp.userType === "FREELANCER" ? totalTaskRevenue : (emp.salary || 1);
      const roi = (totalTaskRevenue / cost).toFixed(1);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role || "Team Member",
        userType: emp.userType, // FULL_TIME, FREELANCER, etc.
        salary: emp.salary || 0,
        totalTaskRevenue,
        efficiencyRate: roi,
      };
    });

    // Global Metrics
    const totalRevenue = formattedEmployees.reduce((sum, emp) => sum + emp.totalTaskRevenue, 0);
    const totalSalary = formattedEmployees.reduce((sum, emp) => sum + emp.salary, 0);
    const globalEfficiency = totalSalary > 0 ? (totalRevenue / totalSalary).toFixed(2) : "0.00";

    return NextResponse.json({
      employees: formattedEmployees,
      metrics: {
        totalRevenue,
        avgRevenuePerHead: totalRevenue / (employees.length || 1),
        globalEfficiency,
      },
    });
  } catch (error) {
    console.error("PERSONNEL_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}