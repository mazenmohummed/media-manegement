// app/api/vendors/[vendorId]/stats/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await params;

    const [reviews, purchaseOrders] = await Promise.all([
      db.vendorPerformanceReview.aggregate({
        where: {
          vendorId,
          agencyId: session.user.agencyId,
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
      db.purchaseOrder.count({
        where: {
          vendorId,
          agencyId: session.user.agencyId,
          status: "DELIVERED",
        },
      }),
    ]);

    return NextResponse.json({
      averageRating: reviews._avg.rating || 0,
      totalReviews: reviews._count.id,
      totalDeliveredOrders: purchaseOrders,
    });

  } catch (error: any) {
    console.error("[VENDOR_STATS_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch vendor stats" },
      { status: 500 }
    );
  }
}