import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Authenticate and get user context
    const user = await getCurrentUser();

    if (!user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch Assets & External Rentals filtered by Agency
    const [assets, externalRentals] = await Promise.all([
      db.asset.findMany({
        where: { agencyId: user.agencyId },
        include: {
          tasks: {
            select: { grossRevenue: true }
          }
        }
      }),
      db.externalRental.findMany({
        where: {
          task: {
            project: { agencyId: user.agencyId }
          }
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

    // 3. Business Logic: Asset ROI & Performance Mapping
    const assetStats = assets.map(asset => {
      const totalRevenueGenerated = asset.tasks.reduce(
        (sum, t) => sum + (t.grossRevenue || 0), 
        0
      );
      
      // ROI Calculation: (Revenue / Current Value) * 100
      const roi = asset.currentValue > 0 
        ? Math.round((totalRevenueGenerated / asset.currentValue) * 100) 
        : 0;

      return {
        id: asset.id,
        name: asset.assetName,
        category: asset.category,
        cost: asset.currentValue, 
        revenue: totalRevenueGenerated,
        roi,
        status: totalRevenueGenerated > asset.currentValue ? "Profitable" : "Recouping"
      };
    });

    // 4. Aggregate Metrics
    const totalValuation = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalLeakage = externalRentals.reduce((sum, r) => sum + r.cost, 0);
    
    // Utilization: Percentage of assets currently assigned to at least one task
    const avgUtilization = assets.length > 0 
      ? Math.round((assets.filter(a => a.tasks.length > 0).length / assets.length) * 100)
      : 0;

    // Aggregate ROI across the whole portfolio
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
      leakageItems: externalRentals.map(r => ({
        id: r.id,
        item: r.itemName,
        cost: r.cost,
        project: r.task.project.projectName
      }))
    });

  } catch (error) {
    console.error("EQUIPMENT_FINANCE_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}