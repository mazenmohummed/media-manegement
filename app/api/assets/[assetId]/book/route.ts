// app/api/assets/[assetId]/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { AssetBookingService } from "@/lib/services/asset-booking.service";

export const POST = withAuthGuard("asset:assign", async (req: NextRequest, { agencyId, userId }, context) => {
  try {
    const params = await context.params;
    const assetId = params.assetId;
    const body = await req.json();
    const { taskId, startDate, endDate } = body;

    if (!assetId || !taskId) {
      return NextResponse.json(
        { error: "Asset ID and Task ID are required" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const result = await AssetBookingService.bookAsset({
      assetId,
      taskId,
      userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Asset booked successfully",
    });
  } catch (error: any) {
    if (error.message.includes("already booked")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }
    console.error("[BOOK_ASSET_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to book asset" },
      { status: 500 }
    );
  }
});

// app/api/assets/[assetId]/release/route.ts
export const DELETE = withAuthGuard("asset:unassign", async (req: NextRequest, { agencyId, userId }, context) => {
  try {
    const params = await context.params;
    const assetId = params.assetId;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!assetId || !taskId) {
      return NextResponse.json(
        { error: "Asset ID and Task ID are required" },
        { status: 400 }
      );
    }

    const result = await AssetBookingService.releaseAsset({
      assetId,
      taskId,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Asset released successfully",
    });
  } catch (error: any) {
    console.error("[RELEASE_ASSET_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to release asset" },
      { status: 500 }
    );
  }
});

// app/api/assets/[assetId]/availability/route.ts
export const GET = withAuthGuard("asset:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const assetId = params.assetId;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const excludeTaskId = searchParams.get("excludeTaskId") || undefined;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const result = await AssetBookingService.checkAssetAvailability({
      assetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      excludeTaskId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[CHECK_ASSET_AVAILABILITY_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check asset availability" },
      { status: 500 }
    );
  }
});