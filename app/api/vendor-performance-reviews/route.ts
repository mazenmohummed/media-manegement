// app/api/vendor-performance-reviews/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vendorId, purchaseOrderId, rating, onTimeDelivery, comment, projectId } = body;

    // Validate required fields
    if (!vendorId || !purchaseOrderId || !rating) {
      return NextResponse.json(
        { error: "Vendor ID, Purchase Order ID, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Verify vendor belongs to agency
    const vendor = await db.vendor.findFirst({
      where: {
        id: vendorId,
        agencyId: session.user.agencyId,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Verify purchase order exists and belongs to this vendor
    const purchaseOrder = await db.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        vendorId: vendorId,
        agencyId: session.user.agencyId,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check if a review already exists for this purchase order
    const existingReview = await db.vendorPerformanceReview.findFirst({
      where: {
        vendorId: vendorId,
        purchaseOrderId: purchaseOrderId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "A review already exists for this purchase order" },
        { status: 409 }
      );
    }

    // Create the performance review
    const review = await db.vendorPerformanceReview.create({
      data: {
        rating,
        onTimeDelivery: onTimeDelivery ?? false,
        comment: comment || null,
        vendorId,
        purchaseOrderId,
        projectId: projectId || null,
        agencyId: session.user.agencyId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            status: true,
          },
        },
      },
    });

    // Get updated vendor stats
    const stats = await db.vendorPerformanceReview.aggregate({
      where: {
        vendorId: vendorId,
        agencyId: session.user.agencyId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      review,
      vendorStats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.id,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("[VENDOR_REVIEW_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create vendor review" },
      { status: 500 }
    );
  }
}

// GET: Fetch vendor performance reviews
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    const whereClause: any = {
      agencyId: session.user.agencyId,
    };

    if (vendorId) whereClause.vendorId = vendorId;
    if (purchaseOrderId) whereClause.purchaseOrderId = purchaseOrderId;

    const reviews = await db.vendorPerformanceReview.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            vendorNo: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectNo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get vendor stats
    let vendorStats = null;
    if (vendorId) {
      const stats = await db.vendorPerformanceReview.aggregate({
        where: {
          vendorId: vendorId,
          agencyId: session.user.agencyId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
      });

      vendorStats = {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.id,
      };
    }

    return NextResponse.json({
      success: true,
      reviews,
      vendorStats,
    }, { status: 200 });

  } catch (error: any) {
    console.error("[VENDOR_REVIEW_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch vendor reviews" },
      { status: 500 }
    );
  }
}