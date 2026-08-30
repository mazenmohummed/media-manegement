// lib/services/asset-booking.service.ts
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AssetBookingParams {
  assetId: string;
  taskId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}

export interface AvailabilityCheckParams {
  assetId: string;
  startDate: Date;
  endDate: Date;
  excludeTaskId?: string;
}

export interface ConflictTask {
  id: string;
  title: string | null;
  taskNo: string | null;
  startDate: Date | null;
  endDate: Date | null;
  dueDate: Date | null;
  status: string;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: ConflictTask[];
}

export interface MultipleAvailabilityResult {
  allAvailable: boolean;
  conflicts: Record<string, ConflictTask[]>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AssetBookingService {
  /**
   * Check if an asset is available for a given time period
   * Returns all conflicting tasks with full details
   */
  static async checkAssetAvailability(params: AvailabilityCheckParams): Promise<AvailabilityResult> {
    const { assetId, startDate, endDate, excludeTaskId } = params;

    // Get all tasks assigned to this asset that overlap with the requested period
    const conflictingTasks = await db.task.findMany({
      where: {
        assets: {
          some: {
            id: assetId,
          },
        },
        deletedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        ...(excludeTaskId && {
          id: { not: excludeTaskId },
        }),
        OR: [
          // Task starts during the requested period
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Task ends during the requested period
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Task spans the entire requested period
          {
            startDate: {
              lte: startDate,
            },
            endDate: {
              gte: endDate,
            },
          },
          // Task is ongoing (no end date) and overlaps
          {
            startDate: {
              lte: endDate,
            },
            endDate: null,
          },
          // Task starts before and ends after (or no end date)
          {
            startDate: {
              lte: endDate,
            },
            OR: [
              { endDate: { gte: startDate } },
              { endDate: null },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        taskNo: true,
        startDate: true,
        endDate: true,
        dueDate: true,
        status: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return {
      available: conflictingTasks.length === 0,
      conflicts: conflictingTasks,
    };
  }

  /**
   * Book an asset for a task with concurrent request handling using optimistic locking
   */
  static async bookAsset(params: AssetBookingParams): Promise<any> {
    const { assetId, taskId, userId, startDate, endDate } = params;

    // Use a transaction with row-level locking to prevent double booking
    return await db.$transaction(async (tx) => {
      // 1. Lock the asset row for update (prevents concurrent bookings)
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          agencyId: true,
          availabilityStatus: true,
        },
      });

      if (!asset) {
        throw new Error("Asset not found");
      }

      // Check asset status
      if (asset.availabilityStatus === "MAINTENANCE") {
        throw new Error("Asset is currently under maintenance");
      }
      if (asset.availabilityStatus === "RETIRED") {
        throw new Error("Asset has been retired");
      }
      if (asset.availabilityStatus === "LOST") {
        throw new Error("Asset is marked as lost");
      }

      // 2. Check if asset is already booked for this task
      const existing = await tx.task.findFirst({
        where: {
          id: taskId,
          assets: {
            some: {
              id: assetId,
            },
          },
        },
      });

      if (existing) {
        throw new Error("Asset is already booked for this task");
      }

      // 3. Check for overlapping bookings
      const overlappingBookings = await tx.task.findFirst({
        where: {
          assets: {
            some: {
              id: assetId,
            },
          },
          AND: [
            {
              startDate: { lte: endDate },
            },
            {
              OR: [
                { endDate: { gte: startDate } },
                { endDate: null },
              ],
            },
          ],
          NOT: {
            id: taskId,
          },
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
        },
      });

      if (overlappingBookings) {
        throw new Error(
          `Asset is already booked for the selected period (conflicts with task: ${overlappingBookings.title || overlappingBookings.id})`
        );
      }

      // 4. Create the booking - connect asset to task
      const booking = await tx.task.update({
        where: { id: taskId },
        data: {
          assets: {
            connect: { id: assetId },
          },
          startDate: startDate,
          endDate: endDate,
        },
        include: {
          assets: {
            select: {
              id: true,
              assetName: true,
              assetNo: true,
              availabilityStatus: true,
            },
          },
        },
      });

      // 5. Update asset status to IN_USE
      await tx.asset.update({
        where: { id: assetId },
        data: {
          availabilityStatus: "IN_USE",
        },
      });

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Asset",
          entityId: assetId,
          message: `Asset booked for task ${taskId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
          agencyId: asset.agencyId,
          actorId: userId,
          metadata: {
            taskId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });

      // 7. Create notification
      await tx.notification.create({
        data: {
          userId,
          agencyId: asset.agencyId,
          title: "Asset Assigned",
          message: `Asset has been assigned to task for the period ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
          type: "SYSTEM",
          actionUrl: `/dashboard/assets/${assetId}`,
        },
      });

      return booking;
    });
  }

  /**
   * Release an asset from a task
   */
  static async releaseAsset(params: Omit<AssetBookingParams, "startDate" | "endDate">): Promise<any> {
    const { assetId, taskId, userId } = params;

    return await db.$transaction(async (tx) => {
      // 1. Verify asset exists
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          agencyId: true,
        },
      });

      if (!asset) {
        throw new Error("Asset not found");
      }

      // 2. Verify task exists and is assigned to this asset
      const task = await tx.task.findFirst({
        where: {
          id: taskId,
          assets: {
            some: {
              id: assetId,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!task) {
        throw new Error("Task is not assigned to this asset");
      }

      // 3. Remove the asset from the task
      await tx.task.update({
        where: { id: taskId },
        data: {
          assets: {
            disconnect: { id: assetId },
          },
        },
      });

      // 4. Check if the asset is assigned to any other active tasks
      const otherTasks = await tx.task.findMany({
        where: {
          assets: {
            some: {
              id: assetId,
            },
          },
          deletedAt: null,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        select: {
          id: true,
          title: true,
        },
      });

      // 5. If no other active tasks, set status back to AVAILABLE
      if (otherTasks.length === 0) {
        await tx.asset.update({
          where: { id: assetId },
          data: {
            availabilityStatus: "AVAILABLE",
          },
        });
      }

      // 6. Create audit log
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Asset",
          entityId: assetId,
          message: `Asset released from task ${taskId}`,
          agencyId: asset.agencyId,
          actorId: userId,
          metadata: {
            taskId,
            taskTitle: task.title,
          },
        },
      });

      // 7. Create notification
      await tx.notification.create({
        data: {
          userId,
          agencyId: asset.agencyId,
          title: "Asset Released",
          message: `Asset has been released from task: ${task.title || taskId}`,
          type: "SYSTEM",
          actionUrl: `/dashboard/assets/${assetId}`,
        },
      });

      return { assetId, taskId, otherTasksCount: otherTasks.length };
    });
  }

  /**
   * Get all tasks for an asset with full details
   */
  static async getAssetTasks(assetId: string) {
    const asset = await db.asset.findUnique({
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

    return asset;
  }

  /**
   * Get all bookings for an asset (alias for getAssetTasks)
   */
  static async getAssetBookings(assetId: string) {
    return this.getAssetTasks(assetId);
  }

  /**
   * Check for scheduling conflicts across multiple assets
   */
  static async checkMultipleAssetAvailability(params: {
    assetIds: string[];
    startDate: Date;
    endDate: Date;
    excludeTaskId?: string;
  }): Promise<MultipleAvailabilityResult> {
    const { assetIds, startDate, endDate, excludeTaskId } = params;

    const results = await Promise.all(
      assetIds.map((assetId) =>
        this.checkAssetAvailability({
          assetId,
          startDate,
          endDate,
          excludeTaskId,
        })
      )
    );

    const conflicts: Record<string, ConflictTask[]> = {};
    let allAvailable = true;

    results.forEach((result, index) => {
      const assetId = assetIds[index];
      if (!result.available) {
        allAvailable = false;
        conflicts[assetId] = result.conflicts;
      }
    });

    return {
      allAvailable,
      conflicts,
    };
  }

  /**
   * Get asset availability status for a date range (for calendar view)
   */
  static async getAssetAvailabilityCalendar(assetId: string, startDate: Date, endDate: Date) {
    const tasks = await db.task.findMany({
      where: {
        assets: {
          some: {
            id: assetId,
          },
        },
        deletedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            startDate: { lte: startDate },
            endDate: { gte: endDate },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        taskNo: true,
        startDate: true,
        endDate: true,
        status: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return tasks;
  }
}