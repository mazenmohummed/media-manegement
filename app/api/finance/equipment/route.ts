import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. FETCH: Assets and Rental Expenses with strict Agency Wall
    const [assets, rentalExpenses] = await Promise.all([
      prisma.asset.findMany({
        where: { agencyId },
        include: {
          tasks: {
            where: { agencyId },
            select: { internalCost: true }
          }
        }
      }),
      prisma.taskExpense.findMany({ 
        where: { 
          agencyId,
          category: "RENTAL" 
        },
        include: {
          task: {
            select: { 
              project: { select: { projectName: true } } 
            }
          }
        }
      })
    ]);

    // 2. LOGIC: ROI & Performance Mapping
    const assetStats = assets.map(asset => {
      const totalRevenueGenerated = asset.tasks.reduce(
        (sum, t) => sum + (Number(t.internalCost) || 0), 
        0
      );
      
      const currentValue = Number(asset.currentValue) || 0;

      // ROI Calculation: (Revenue Generated / Current Asset Value) * 100
      const roi = currentValue > 0 
        ? Math.round((totalRevenueGenerated / currentValue) * 100) 
        : 0;

      return {
        id: asset.id,
        name: asset.assetName,
        category: asset.category,
        // CRITICAL FIX: Renamed valuation to cost to match Frontend toLocaleString calls
        cost: currentValue, 
        revenue: totalRevenueGenerated,
        roi,
        status: totalRevenueGenerated > currentValue ? "Profitable" : "Recouping"
      };
    });

    // 3. METRICS: Derived from scoped data
    const totalValuation = assetStats.reduce((sum, a) => sum + a.cost, 0);
    const totalLeakage = rentalExpenses.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    
    // Utilization: % of owned assets currently assigned to at least one task
    const activeAssetsCount = assets.filter(a => a.tasks.length > 0).length;
    const avgUtilization = assets.length > 0 
      ? Math.round((activeAssetsCount / assets.length) * 100)
      : 0;

    const totalRevenue = assetStats.reduce((sum, a) => sum + a.revenue, 0);
    const aggregateROI = totalValuation > 0 
      ? `${Math.round((totalRevenue / totalValuation) * 100)}%` 
      : "0%";

    return NextResponse.json({
      metrics: {
        totalValuation,
        totalLeakage, 
        avgUtilization,
        assetROI: aggregateROI
      },
      assets: assetStats,
      leakageItems: rentalExpenses.map(r => ({
        id: r.id,
        item: r.itemName,
        cost: Number(r.cost) || 0,
        project: r.task?.project?.projectName || "Direct Task"
      }))
    });

  } catch (error: any) {
    console.error("EQUIPMENT_FINANCE_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}