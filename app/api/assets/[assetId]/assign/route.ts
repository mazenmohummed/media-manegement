// app/api/assets/[assetId]/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { AssetBookingService } from "@/lib/services/asset-booking.service";

// ─── POST /api/assets/[assetId]/assign ──────────────────────────────────────
// Assign an asset to a task
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

    const db = getScopedPrisma(agencyId);

    // ── 1. Get asset with current tasks ──────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: {
            deletedAt: null,
            status: { notIn: ["CANCELLED", "COMPLETED"] },
          },
          select: {
            id: true,
            title: true,
            taskNo: true,
            startDate: true,
            endDate: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // ── 2. Check asset status ──────────────────────────────────────────────────
    if (asset.availabilityStatus === "MAINTENANCE") {
      return NextResponse.json(
        {
          error: "Asset Conflict",
          message: "This asset is currently under maintenance and cannot be assigned.",
          conflictType: "MAINTENANCE",
        },
        { status: 409 }
      );
    }

    if (asset.availabilityStatus === "RETIRED") {
      return NextResponse.json(
        {
          error: "Asset Conflict",
          message: "This asset has been retired and cannot be assigned.",
          conflictType: "RETIRED",
        },
        { status: 409 }
      );
    }

    if (asset.availabilityStatus === "LOST") {
      return NextResponse.json(
        {
          error: "Asset Conflict",
          message: "This asset is marked as lost and cannot be assigned.",
          conflictType: "LOST",
        },
        { status: 409 }
      );
    }

    // ── 3. Get task details ────────────────────────────────────────────────────
    const targetTask = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        taskNo: true,
        startDate: true,
        endDate: true,
        dueDate: true,
        status: true,
      },
    });

    if (!targetTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // ── 4. Check if already assigned ──────────────────────────────────────────
    const alreadyAssigned = asset.tasks.some((t) => t.id === taskId);
    if (alreadyAssigned) {
      return NextResponse.json(
        {
          error: "Already Assigned",
          message: "This task is already assigned to this asset.",
        },
        { status: 409 }
      );
    }

    // ── 5. Determine booking dates ────────────────────────────────────────────
    const bookingStartDate = startDate 
      ? new Date(startDate) 
      : (targetTask.startDate || new Date());
    
    const bookingEndDate = endDate 
      ? new Date(endDate) 
      : (targetTask.endDate || targetTask.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // ── 6. Check for date conflicts using AssetBookingService ─────────────────
    const availability = await AssetBookingService.checkAssetAvailability({
      assetId,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
      excludeTaskId: taskId,
    });

    if (!availability.available && availability.conflicts.length > 0) {
  // Now conflicts include all fields from the service
  const conflictDetails = availability.conflicts.map((c) => ({
    taskId: c.id,
    taskTitle: c.title || "Untitled Task",
    taskNo: c.taskNo || c.id.slice(0, 8),
    startDate: c.startDate,
    endDate: c.endDate,
    dueDate: c.dueDate,
  }));

      return NextResponse.json(
        {
          error: "Asset Conflict",
          message: `This asset is already assigned to ${conflictDetails.length} task(s) during the same time period.`,
          conflictType: "DATE_OVERLAP",
          conflicts: conflictDetails,
        },
        { status: 409 }
      );
    }

    // ── 7. Book the asset ──────────────────────────────────────────────────────
    await AssetBookingService.bookAsset({
      assetId,
      taskId,
      userId,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
    });

    // ── 8. Get updated asset with all tasks ──────────────────────────────────
    const updatedAsset = await db.asset.findFirst({
      where: { id: assetId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            taskNo: true,
            status: true,
            startDate: true,
            endDate: true,
            dueDate: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: "Asset assigned successfully",
    });
  } catch (error: any) {
    console.error("[ASSIGN_ASSET_ERROR]:", error);
    
    if (error.message.includes("already booked")) {
      return NextResponse.json(
        { 
          error: "Asset Conflict", 
          message: error.message,
          conflictType: "DATE_OVERLAP",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to assign asset" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/assets/[assetId]/assign ──────────────────────────────────────
// Unassign an asset from a task
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

    const db = getScopedPrisma(agencyId);

    // ── 1. Verify asset exists ────────────────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: {
            deletedAt: null,
            status: { notIn: ["CANCELLED", "COMPLETED"] },
          },
          select: { id: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // ── 2. Check if task is assigned to this asset ────────────────────────────
    const isAssigned = asset.tasks.some((t) => t.id === taskId);
    if (!isAssigned) {
      return NextResponse.json(
        { 
          error: "Not Assigned", 
          message: "This task is not assigned to this asset." 
        },
        { status: 400 }
      );
    }

    // ── 3. Release the asset using the service ─────────────────────────────────
    await AssetBookingService.releaseAsset({
      assetId,
      taskId,
      userId,
    });

    // ── 4. Get updated asset ──────────────────────────────────────────────────
    const updatedAsset = await db.asset.findFirst({
      where: { id: assetId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            taskNo: true,
            status: true,
            startDate: true,
            endDate: true,
            dueDate: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: "Asset unassigned successfully",
    });
  } catch (error: any) {
    console.error("[UNASSIGN_ASSET_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unassign asset" },
      { status: 500 }
    );
  }
});

// ─── GET /api/assets/[assetId]/assign ────────────────────────────────────────
// Get all tasks assigned to an asset
export const GET = withAuthGuard("asset:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const assetId = params.assetId;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            taskNo: true,
            status: true,
            startDate: true,
            endDate: true,
            dueDate: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            assignees: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        assetName: asset.assetName,
        assetNo: asset.assetNo,
        availabilityStatus: asset.availabilityStatus,
      },
      tasks: asset.tasks,
      count: asset.tasks.length,
    });
  } catch (error: any) {
    console.error("[GET_ASSET_TASKS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch asset tasks" },
      { status: 500 }
    );
  }
});

// ─── POST /api/assets/[assetId]/assign/bulk ──────────────────────────────────
// Bulk assign multiple tasks to an asset
export const POST_BULK = withAuthGuard("asset:assign", async (req: NextRequest, { agencyId, userId }, context) => {
  try {
    const params = await context.params;
    const assetId = params.assetId;
    const body = await req.json();
    const { taskIds, startDate, endDate } = body;

    if (!assetId || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "Asset ID and at least one Task ID are required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Verify asset exists
    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        availabilityStatus: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Check asset status
    if (["MAINTENANCE", "RETIRED", "LOST"].includes(asset.availabilityStatus)) {
      return NextResponse.json(
        {
          error: "Asset Conflict",
          message: `This asset is ${asset.availabilityStatus.toLowerCase()} and cannot be assigned.`,
        },
        { status: 409 }
      );
    }

    const results = [];
    const errors = [];

    for (const taskId of taskIds) {
      try {
        // Check if task exists
        const task = await db.task.findFirst({
          where: {
            id: taskId,
            agencyId: agencyId,
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            taskNo: true,
            startDate: true,
            endDate: true,
            dueDate: true,
          },
        });

        if (!task) {
          errors.push({ taskId, error: "Task not found" });
          continue;
        }

        // Check for conflicts
        const bookingStartDate = startDate ? new Date(startDate) : (task.startDate || new Date());
        const bookingEndDate = endDate ? new Date(endDate) : (task.endDate || task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        const availability = await AssetBookingService.checkAssetAvailability({
          assetId,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
          excludeTaskId: taskId,
        });

        if (!availability.available && availability.conflicts.length > 0) {
          errors.push({ 
            taskId, 
            error: "Date conflict with existing assignment",
            conflicts: availability.conflicts,
          });
          continue;
        }

        // Book the asset
        await AssetBookingService.bookAsset({
          assetId,
          taskId,
          userId,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
        });

        results.push({ taskId, success: true });
      } catch (error: any) {
        errors.push({ taskId, error: error.message });
      }
    }

    // Get updated asset
    const updatedAsset = await db.asset.findFirst({
      where: { id: assetId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            taskNo: true,
            status: true,
            startDate: true,
            endDate: true,
            dueDate: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      results: {
        successCount: results.length,
        errorCount: errors.length,
        successes: results,
        errors: errors,
      },
      message: `Successfully assigned ${results.length} tasks, ${errors.length} failed.`,
    });
  } catch (error: any) {
    console.error("[BULK_ASSIGN_ASSET_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bulk assign tasks" },
      { status: 500 }
    );
  }
});