// app/api/attendance/midnight-shift/[logId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { AttendanceService } from "@/lib/services/attendance.service";

// ─── POST /api/attendance/midnight-shift/[logId] ────────────────────────────
// Handle midnight-crossing shifts
export const POST = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const logId = params.logId;

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    const result = await AttendanceService.handleMidnightShift(logId);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Midnight shift processed successfully",
    });
  } catch (error: any) {
    console.error("[MIDNIGHT_SHIFT_ERROR]:", error);
    
    if (error.message === "Attendance log not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process midnight shift" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/midnight-shift/[logId] ─────────────────────────────
// Get details of a midnight shift
export const GET = withAuthGuard("attendance:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const logId = params.logId;

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    const log = await db.attendanceLog.findFirst({
      where: {
        id: logId,
        agencyId: agencyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            taskNo: true,
          },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "Attendance log not found" },
        { status: 404 }
      );
    }

    // Calculate shift details
    const checkIn = new Date(log.checkInTime);
    const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : new Date();
    
    let totalHours = 0;
    let isNightShift = false;
    
    if (checkOut < checkIn) {
      // Shift crosses midnight
      const midnight = new Date(checkIn);
      midnight.setHours(24, 0, 0, 0);
      const hoursToMidnight = (midnight.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const hoursAfterMidnight = checkOut.getHours() + (checkOut.getMinutes() / 60);
      totalHours = hoursToMidnight + hoursAfterMidnight;
      isNightShift = true;
    } else {
      totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      isNightShift = checkIn.getHours() >= 22 || checkIn.getHours() < 6;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...log,
        shiftDetails: {
          isNightShift,
          totalHours: Math.round(totalHours * 100) / 100,
          checkInTime: checkIn.toISOString(),
          checkOutTime: checkOut.toISOString(),
          crossesMidnight: checkOut < checkIn,
        },
      },
    });
  } catch (error: any) {
    console.error("[GET_MIDNIGHT_SHIFT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shift details" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/attendance/midnight-shift/[logId] ────────────────────────────
// Update a midnight shift (e.g., adjust hours)
export const PATCH = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const logId = params.logId;
    const body = await req.json();
    const { totalHours, checkOutTime } = body;

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Verify log exists
    const existingLog = await db.attendanceLog.findFirst({
      where: {
        id: logId,
        agencyId: agencyId,
      },
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: "Attendance log not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (totalHours !== undefined) {
      updateData.totalHours = parseFloat(totalHours);
    }
    
    if (checkOutTime) {
      updateData.checkOutTime = new Date(checkOutTime);
      // Recalculate total hours if checkout time is provided
      const checkIn = new Date(existingLog.checkInTime);
      const checkOut = new Date(checkOutTime);
      if (checkOut > checkIn) {
        updateData.totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }
    }

    const updatedLog = await db.attendanceLog.update({
      where: { id: logId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: "Shift updated successfully",
    });
  } catch (error: any) {
    console.error("[UPDATE_MIDNIGHT_SHIFT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update shift" },
      { status: 500 }
    );
  }
});

// ─── POST /api/attendance/midnight-shift/bulk ────────────────────────────────
// Process multiple midnight shifts
export const POST_BULK = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const body = await req.json();
    const { logIds } = body;

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json(
        { error: "logIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const logId of logIds) {
      try {
        const result = await AttendanceService.handleMidnightShift(logId);
        results.push({ logId, success: true, result });
      } catch (error: any) {
        errors.push({ logId, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        failed: errors.length,
        results,
        errors,
      },
      message: `Processed ${results.length} shifts, ${errors.length} failed`,
    });
  } catch (error: any) {
    console.error("[BULK_MIDNIGHT_SHIFT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process midnight shifts" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/midnight-shift ──────────────────────────────────────
// List all midnight shifts
export const GET_LIST = withAuthGuard("attendance:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    const whereClause: any = {
      agencyId: agencyId,
    };

    // Filter by date range
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.date = {
        lte: new Date(endDate),
      };
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Get logs that might be night shifts (check-in after 10 PM or before 6 AM)
    const logs = await db.attendanceLog.findMany({
      where: {
        ...whereClause,
        OR: [
          {
            checkInTime: {
              gte: new Date(new Date().setHours(22, 0, 0, 0)),
            },
          },
          {
            checkInTime: {
              lte: new Date(new Date().setHours(6, 0, 0, 0)),
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            taskNo: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Process each log to add shift details
    const processedLogs = logs.map((log) => {
      const checkIn = new Date(log.checkInTime);
      const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : new Date();
      
      let totalHours = 0;
      let isNightShift = false;
      let crossesMidnight = false;
      
      if (checkOut < checkIn) {
        const midnight = new Date(checkIn);
        midnight.setHours(24, 0, 0, 0);
        const hoursToMidnight = (midnight.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        const hoursAfterMidnight = checkOut.getHours() + (checkOut.getMinutes() / 60);
        totalHours = hoursToMidnight + hoursAfterMidnight;
        crossesMidnight = true;
        isNightShift = true;
      } else {
        totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        isNightShift = checkIn.getHours() >= 22 || checkIn.getHours() < 6;
      }

      return {
        ...log,
        shiftDetails: {
          isNightShift,
          totalHours: Math.round(totalHours * 100) / 100,
          crossesMidnight,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: processedLogs,
      count: processedLogs.length,
    });
  } catch (error: any) {
    console.error("[LIST_MIDNIGHT_SHIFTS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list midnight shifts" },
      { status: 500 }
    );
  }
});