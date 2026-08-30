// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { AttendanceService } from "@/lib/services/attendance.service";
import { db } from "@/lib/db";

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Get safe day name with fallback
 */
function getSafeDayName(date: Date): string {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  return dayName || "Monday";
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate if location is within office geofence
 */
async function validateOfficeLocation(
  agencyId: string,
  latitude: number,
  longitude: number
): Promise<{ isValid: boolean; message: string; distance: number }> {
  const agency = await db.agency.findFirst({
    where: { id: agencyId },
    select: {
      latitude: true,
      longitude: true,
      radius: true,
    },
  });

  if (!agency?.latitude || !agency?.longitude) {
    return {
      isValid: true,
      message: "Office location not configured, skipping geofence check",
      distance: 0,
    };
  }

  const distance = calculateDistance(
    agency.latitude,
    agency.longitude,
    latitude,
    longitude
  );

  const radius = agency.radius || 100;

  if (distance > radius) {
    return {
      isValid: false,
      message: `You are ${Math.round(distance)}m away from the office. Maximum allowed distance is ${radius}m.`,
      distance,
    };
  }

  return {
    isValid: true,
    message: `Location verified (${Math.round(distance)}m from office)`,
    distance,
  };
}

/**
 * Determines if a user must be physically at the office to check in
 * Only FULL_TIME/PART_TIME employees in TEAMLEADER/CREATIVE/FINANCE roles
 * are required to satisfy the office geofence.
 */
function requiresOfficeLocationValidation(userType: string, role: string | null): boolean {
  const eligibleUserTypes = ["FULL_TIME", "PART_TIME"];
  const eligibleRoles = ["TEAMLEADER", "CREATIVE", "FINANCE"];

  return (
    eligibleUserTypes.includes(userType) &&
    !!role &&
    eligibleRoles.includes(role)
  );
}

/**
 * Check if user is late based on working hours
 */
function checkIfLate(openTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = openTime.split(":").map(Number);
  const openTimeDate = new Date(now);
  openTimeDate.setHours(hours, minutes, 0, 0);

  // 15 minutes grace period
  const gracePeriod = 15 * 60 * 1000;
  return now.getTime() > openTimeDate.getTime() + gracePeriod;
}

/**
 * Check if user is leaving early
 */
function checkIfEarlyOut(closeTime: string, checkOutTime: Date): boolean {
  const [hours, minutes] = closeTime.split(":").map(Number);
  const closeTimeDate = new Date(checkOutTime);
  closeTimeDate.setHours(hours, minutes, 0, 0);

  // 15 minutes grace period
  const gracePeriod = 15 * 60 * 1000;
  return checkOutTime.getTime() < closeTimeDate.getTime() - gracePeriod;
}

// ─── POST /api/attendance/check-in ──────────────────────────────────────────
// Check in a user
export const POST_CHECKIN = withAuthGuard("attendance:create", async (
  req: NextRequest,
  { agencyId, userId }
) => {
  try {
    const body = await req.json();
    const { location, taskId } = body;

    // Get user details for validation
    const user = await db.user.findFirst({
      where: { id: userId },
      select: {
        userType: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await db.attendanceLog.findFirst({
      where: {
        userId,
        date: today,
        checkOutTime: null,
      },
    });

    if (existingLog) {
      return NextResponse.json(
        { error: "You are already checked in" },
        { status: 409 }
      );
    }

    // Validate location if required
    const needsLocationCheck = requiresOfficeLocationValidation(
      user.userType,
      user.role
    );

    if (needsLocationCheck) {
      if (!location?.lat || !location?.lng) {
        return NextResponse.json(
          {
            error: "Location is required for office check-in. Please enable location services.",
            code: "LOCATION_REQUIRED",
            userType: user.userType,
            role: user.role,
          },
          { status: 400 }
        );
      }

      const locationValidation = await validateOfficeLocation(
        agencyId,
        location.lat,
        location.lng
      );

      if (!locationValidation.isValid) {
        return NextResponse.json(
          {
            error: locationValidation.message,
            code: "OUTSIDE_GEOFENCE",
            distance: locationValidation.distance,
            userType: user.userType,
            role: user.role,
          },
          { status: 403 }
        );
      }
    }

    // Check if late
    const safeDayName = getSafeDayName(today);
    const workingDay = await db.workingDay.findFirst({
      where: {
        agencyId,
        day: safeDayName,
      },
    });

    const isLate = workingDay && !workingDay.isClosed
      ? checkIfLate(workingDay.openTime)
      : false;

    // Create attendance log
    const log = await db.attendanceLog.create({
      data: {
        date: today,
        checkInTime: new Date(),
        isLate: isLate || false,
        status: isLate ? "LATE_CHECKIN" : "PRESENT",
        type: "OFFICE",
        userId,
        agencyId,
        taskId: taskId || undefined,
        ...(location && {
          checkInLatitude: location.lat,
          checkInLongitude: location.lng,
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            userType: true,
          },
        },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        agencyId,
        title: "Attendance Checked In",
        message: `${log.user.name} checked in${isLate ? ' (LATE)' : ''} at ${new Date().toLocaleTimeString()}`,
        type: "ATTENDANCE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Checked in successfully",
      data: log,
      isLate,
      locationValidated: needsLocationCheck,
      userType: user.userType,
      role: user.role,
    });
  } catch (error: any) {
    console.error("[CHECK_IN_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check in" },
      { status: 500 }
    );
  }
});

// ─── POST /api/attendance/check-out ─────────────────────────────────────────
// Check out a user
export const POST_CHECKOUT = withAuthGuard("attendance:update", async (
  req: NextRequest,
  { agencyId, userId }
) => {
  try {
    const body = await req.json();
    const { location } = body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active check-in
    const log = await db.attendanceLog.findFirst({
      where: {
        userId,
        date: today,
        checkOutTime: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            userType: true,
          },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "No active check-in found" },
        { status: 404 }
      );
    }

    const checkOutTime = new Date();
    const totalHours =
      (checkOutTime.getTime() - log.checkInTime.getTime()) /
      (1000 * 60 * 60);

    // Check if early out
    const safeDayName = getSafeDayName(today);
    const workingDay = await db.workingDay.findFirst({
      where: {
        agencyId,
        day: safeDayName,
      },
    });

    const isEarlyOut = workingDay && !workingDay.isClosed
      ? checkIfEarlyOut(workingDay.closeTime, checkOutTime)
      : false;

    // Update log
    const updatedLog = await db.attendanceLog.update({
      where: { id: log.id },
      data: {
        checkOutTime,
        totalHours,
        isEarlyOut: isEarlyOut || false,
        status: isEarlyOut ? "EARLY_CHECKOUT" : "PRESENT",
        ...(location && {
          checkOutLatitude: location.lat,
          checkOutLongitude: location.lng,
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            userType: true,
          },
        },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        agencyId,
        title: "Attendance Checked Out",
        message: `${updatedLog.user.name} checked out after ${totalHours.toFixed(1)} hours`,
        type: "ATTENDANCE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Checked out successfully",
      data: updatedLog,
      totalHours,
      isEarlyOut,
    });
  } catch (error: any) {
    console.error("[CHECK_OUT_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check out" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/today ─────────────────────────────────────────────
// Get today's attendance for the current user
export const GET_TODAY = withAuthGuard("attendance:read", async (
  req: NextRequest,
  { userId, agencyId }
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await db.attendanceLog.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            userType: true,
          },
        },
        taskSessions: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                taskType: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    // Get working hours for today
    const safeDayName = getSafeDayName(today);
    const workingDay = agencyId
      ? await db.workingDay.findFirst({
          where: {
            agencyId,
            day: safeDayName,
          },
        })
      : null;

    return NextResponse.json({
      success: true,
      data: log,
      workingHours: workingDay,
    });
  } catch (error: any) {
    console.error("[GET_TODAY_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch today's attendance" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/weekly ─────────────────────────────────────────────
// Get weekly attendance summary
export const GET_WEEKLY = withAuthGuard("attendance:read", async (
  req: NextRequest,
  { userId }
) => {
  try {
    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get("weekStart");
    const weekStart = weekStartParam ? new Date(weekStartParam) : new Date();

    const summary = await AttendanceService.getWeeklySummary(userId, weekStart);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[GET_WEEKLY_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch weekly summary" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/range ──────────────────────────────────────────────
// Get attendance for a date range
export const GET_RANGE = withAuthGuard("attendance:read", async (
  req: NextRequest,
  { userId }
) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    const logs = await AttendanceService.getAttendanceRange(
      userId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error("[GET_RANGE_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance range" },
      { status: 500 }
    );
  }
});

// ─── GET /api/attendance/stats ──────────────────────────────────────────────
// Get attendance statistics
export const GET_STATS = withAuthGuard("attendance:read", async (
  req: NextRequest,
  { userId }
) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDateParam = searchParams.get("endDate") || new Date().toISOString();

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    const stats = await AttendanceService.getUserAttendanceStats(
      userId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("[GET_ATTENDANCE_STATS_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance statistics" },
      { status: 500 }
    );
  }
});

// ─── POST /api/attendance/midnight-shift ────────────────────────────────────
// Handle midnight shift (manual override)
export const POST_MIDNIGHT = withAuthGuard("attendance:manage", async (
  req: NextRequest,
  { agencyId }
) => {
  try {
    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    const result = await AttendanceService.handleMidnightShift(logId);

    return NextResponse.json({
      success: true,
      message: "Midnight shift processed successfully",
      data: result,
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

// ─── POST /api/attendance/overlap ───────────────────────────────────────────
// Handle overlapping logs
export const POST_OVERLAP = withAuthGuard("attendance:manage", async (
  req: NextRequest,
  { userId }
) => {
  try {
    const body = await req.json();
    const { date } = body;

    const targetDate = date ? new Date(date) : new Date();
    
    const result = await AttendanceService.handleOverlappingLogs(
      userId,
      targetDate
    );

    return NextResponse.json({
      success: true,
      message: "Overlapping logs processed successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[OVERLAP_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process overlapping logs" },
      { status: 500 }
    );
  }
});