// app/api/attendance/auto-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { AttendanceService } from "@/lib/services/attendance.service";

// ─── POST /api/attendance/auto-checkout ──────────────────────────────────────
// Run auto-checkout for all open logs
export const POST = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId, userId }) => {
  try {
    const results = await AttendanceService.handleMissedCheckout();
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Auto-checkout completed. ${results.length} records updated.`,
    });
  } catch (error: any) {
    console.error("[AUTO_CHECKOUT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process auto-checkout" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/auto-checkout ──────────────────────────────────────
// Get logs that are eligible for auto-checkout
export const GET = withAuthGuard("attendance:read", async (req: NextRequest, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const threshold = parseInt(searchParams.get("threshold") || "12"); // Default 12 hours

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = {
      agencyId: agencyId,
      date: { gte: today },
      checkOutTime: null,
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const openLogs = await db.attendanceLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
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
      orderBy: { checkInTime: "asc" },
    });

    const now = new Date();
    const eligibleLogs = openLogs.map((log) => {
      const checkInTime = new Date(log.checkInTime);
      const hoursSinceCheckin = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      return {
        ...log,
        hoursSinceCheckin: Math.round(hoursSinceCheckin * 100) / 100,
        isEligible: hoursSinceCheckin >= threshold,
        checkInTimeFormatted: checkInTime.toLocaleString(),
      };
    });

    // Group by user for summary
    const userSummary = eligibleLogs.reduce((acc: any, log) => {
      const userId = log.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userName: log.user.name,
          userEmail: log.user.email,
          userRole: log.user.role,
          totalLogs: 0,
          eligibleLogs: 0,
        };
      }
      acc[userId].totalLogs++;
      if (log.isEligible) {
        acc[userId].eligibleLogs++;
      }
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        logs: eligibleLogs,
        summary: {
          totalOpenLogs: openLogs.length,
          eligibleCount: eligibleLogs.filter((log) => log.isEligible).length,
          byUser: Object.values(userSummary),
        },
        thresholdHours: threshold,
      },
    });
  } catch (error: any) {
    console.error("[GET_AUTO_CHECKOUT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch auto-checkout logs" },
      { status: 500 }
    );
  }
});

// ─── PATCH /api/attendance/auto-checkout/[logId] ─────────────────────────────
// Manually checkout a specific log
export const PATCH = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const logId = params.logId;
    const body = await req.json();
    const { checkOutTime, totalHours } = body;

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

    // If already checked out, return error
    if (existingLog.checkOutTime) {
      return NextResponse.json(
        { error: "This log is already checked out" },
        { status: 400 }
      );
    }

    const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();
    const calculatedTotalHours = totalHours !== undefined 
      ? totalHours 
      : (checkOut.getTime() - new Date(existingLog.checkInTime).getTime()) / (1000 * 60 * 60);

    const updatedLog = await db.attendanceLog.update({
      where: { id: logId },
      data: {
        checkOutTime: checkOut,
        totalHours: calculatedTotalHours,
        status: "OUT_OF_OFFICE",
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
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: "Manual checkout completed successfully",
    });
  } catch (error: any) {
    console.error("[MANUAL_CHECKOUT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to checkout" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/attendance/auto-checkout/[logId] ────────────────────────────
// Delete an auto-checkout log (admin only)
export const DELETE = withAuthGuard("attendance:delete", async (req: NextRequest, { agencyId }, context) => {
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

    await db.attendanceLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance log deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE_ATTENDANCE_LOG_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete attendance log" },
      { status: 500 }
    );
  }
});

// ─── POST /api/attendance/auto-checkout/bulk ─────────────────────────────────
// Bulk auto-checkout for multiple users or all users
export const POST_BULK = withAuthGuard("attendance:update", async (req: NextRequest, { agencyId }) => {
  try {
    const body = await req.json();
    const { userIds, threshold } = body;

    const db = getScopedPrisma(agencyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const checkThreshold = threshold || 12;

    const whereClause: any = {
      agencyId: agencyId,
      date: { gte: today },
      checkOutTime: null,
    };

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      whereClause.userId = { in: userIds };
    }

    const openLogs = await db.attendanceLog.findMany({
      where: whereClause,
    });

    const results = [];
    const errors = [];

    for (const log of openLogs) {
      const checkInTime = new Date(log.checkInTime);
      const hoursSinceCheckin = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheckin >= checkThreshold) {
        try {
          const updated = await db.attendanceLog.update({
            where: { id: log.id },
            data: {
              checkOutTime: now,
              totalHours: hoursSinceCheckin,
              status: "OUT_OF_OFFICE",
            },
          });

          // Create notification
          await db.notification.create({
            data: {
              userId: log.userId,
              agencyId: agencyId,
              title: "Auto Checkout Applied",
              message: `Your attendance was automatically checked out after ${Math.round(hoursSinceCheckin)} hours.`,
              type: "WARNING",
            },
          });

          results.push({
            logId: log.id,
            userId: log.userId,
            hoursSinceCheckin: Math.round(hoursSinceCheckin * 100) / 100,
          });
        } catch (error: any) {
          errors.push({
            logId: log.id,
            userId: log.userId,
            error: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        failed: errors.length,
        results,
        errors,
        totalEligible: openLogs.filter(
          (log) => (now.getTime() - new Date(log.checkInTime).getTime()) / (1000 * 60 * 60) >= checkThreshold
        ).length,
      },
      message: `Bulk auto-checkout completed. ${results.length} records updated, ${errors.length} failed.`,
    });
  } catch (error: any) {
    console.error("[BULK_AUTO_CHECKOUT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk auto-checkout" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/auto-checkout/stats ─────────────────────────────────
// Get statistics about auto-checkout
export const GET_STATS = withAuthGuard("attendance:read", async (req: NextRequest, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all logs that were auto-checked out in the last N days
    const autoCheckedLogs = await db.attendanceLog.findMany({
      where: {
        agencyId: agencyId,
        date: { gte: startDate },
        status: "OUT_OF_OFFICE",
        checkOutTime: {
          not: null,
        },
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
      },
    });

    // Calculate statistics
    const totalAutoCheckouts = autoCheckedLogs.length;
    const totalHours = autoCheckedLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    
    // Group by user
    const byUser = autoCheckedLogs.reduce((acc: any, log) => {
      const userId = log.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userName: log.user.name,
          userEmail: log.user.email,
          userRole: log.user.role,
          count: 0,
          totalHours: 0,
        };
      }
      acc[userId].count++;
      acc[userId].totalHours += (log.totalHours || 0);
      return acc;
    }, {});

    // Group by date
    const byDate = autoCheckedLogs.reduce((acc: any, log) => {
      const dateKey = new Date(log.date).toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = 0;
      }
      acc[dateKey]++;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        totalAutoCheckouts,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: totalAutoCheckouts > 0 ? Math.round((totalHours / totalAutoCheckouts) * 100) / 100 : 0,
        byUser: Object.values(byUser),
        byDate: Object.entries(byDate).map(([date, count]) => ({ date, count })),
        daysRange: days,
      },
    });
  } catch (error: any) {
    console.error("[AUTO_CHECKOUT_STATS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch auto-checkout statistics" },
      { status: 500 }
    );
  }
});