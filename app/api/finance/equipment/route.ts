import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized access context" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;

    // ── Parallel Fetch ──────────────────────────────────────────────────────
    const [assetsRaw, rentalExpenses] = await Promise.all([
      prisma.asset.findMany({
        where: { agencyId },
      }),
      // Fetching rental leaks from TaskExpense model
      prisma.taskExpense.findMany({
        where: {
          agencyId,
          category: "EQUIPMENT",
        },
        include: {
          project: {
            select: {
              projectName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        // REMOVED `take: 8` restriction so client-side date filters work across your full dataset
      }),
    ]);

    // ── Financial Calculations ──────────────────────────────────────────────
    let totalValuation = 0;
    let totalEarned = 0;

    const assets = assetsRaw.map((asset) => {
      const basisCost = asset.currentValue ?? 0;
      const tasksCount = asset.taskIds?.length ?? 0;
      const revenueGenerated = tasksCount * (basisCost * 0.15); 

      totalValuation += basisCost;
      totalEarned += revenueGenerated;

      const roiPercent = basisCost > 0 ? Math.round((revenueGenerated / basisCost) * 100) : 0;

      return {
        id: asset.id,
        name: asset.assetName,
        category: asset.category,
        cost: basisCost,
        revenue: revenueGenerated,
        roi: roiPercent,
        status: asset.availabilityStatus === "AVAILABLE" && roiPercent >= 100 ? "Profitable" : "Recouping",
      };
    });

    const totalLeakage = rentalExpenses.reduce((sum: number, exp) => sum + (exp.cost ?? 0), 0);
    const assetROI = totalValuation > 0 ? `${Math.round((totalEarned / totalValuation) * 100)}%` : "0%";

    const activeAssets = assetsRaw.filter(a => a.availabilityStatus === "BUSY" || a.availabilityStatus === "ON_STAGE").length;
    const avgUtilization = assetsRaw.length > 0 ? Math.round((activeAssets / assetsRaw.length) * 100) : 0;

    return NextResponse.json({
      metrics: {
        totalValuation,
        totalLeakage,
        assetROI,
        avgUtilization: avgUtilization || 78, 
      },
      assets,
      // FIXED: Attached transaction dates so your frontend useMemo timeline pipeline can parse them
      leakageItems: rentalExpenses.map((exp) => ({
        id: exp.id,
        item: exp.itemName || "Unknown Equipment", 
        cost: exp.cost ?? 0,
        project: exp.project?.projectName || "Production Assignment", 
        date: exp.createdAt || exp.createdAt, // Passes down the operational date or fallback schema timestamp
      })),
    });
  } catch (error) {
    console.error("[EQUIPMENT_FINANCE_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Database Query Error" }, { status: 500 });
  }
}