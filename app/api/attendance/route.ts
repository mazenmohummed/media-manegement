// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { AttendanceService } from "@/lib/services/attendance.service";
import { prisma } from "@/lib/prisma";

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
  const agency = await prisma.agency.findFirst({
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

// ─── GET /api/attendance ─────────────────────────────────────────────────────
// Main GET handler - handles all GET requests with query params

export const GET = withAuthGuard("attendance:read", async (
  req: NextRequest,
  { userId, agencyId }
) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const weekStartParam = url.searchParams.get("weekStart");

    // ─── Get today's attendance ──────────────────────────────────────────────
    if (!action || action === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const log = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
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
      const workingDay = await prisma.workingDay.findFirst({
        where: {
          agencyId,
          day: safeDayName,
        },
      });

      return NextResponse.json({
        success: true,
        data: log,
        workingHours: workingDay,
      });
    }

    // ─── Get weekly attendance ───────────────────────────────────────────────
    if (action === "weekly") {
      const weekStart = weekStartParam ? new Date(weekStartParam) : new Date();
      const summary = await AttendanceService.getWeeklySummary(userId, weekStart);

      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // ─── Get range attendance ────────────────────────────────────────────────
    if (action === "range") {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          { error: "Start date and end date are required for range" },
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
    }

    // ─── Get attendance stats ────────────────────────────────────────────────
    if (action === "stats") {
      const startDate = startDateParam 
        ? new Date(startDateParam) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endDateParam 
        ? new Date(endDateParam) 
        : new Date();

      const stats = await AttendanceService.getUserAttendanceStats(
        userId,
        startDate,
        endDate
      );

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // ─── Default: return today's attendance ─────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const log = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
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
      orderBy: { checkInTime: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: log,
    });

  } catch (error: any) {
    console.error("[GET_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
});

// ─── POST /api/attendance ────────────────────────────────────────────────────
// Main POST handler - handles check-in and check-out

export const POST = withAuthGuard("attendance:create", async (
  req: NextRequest,
  { userId, agencyId }
) => {
  try {
    const body = await req.json();
    const { action, location, taskId, logId } = body;

    // ─── Check In ─────────────────────────────────────────────────────────────
    if (!action || action === "check-in") {
      // Get user details for validation
      const user = await prisma.user.findFirst({
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
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingLog = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
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
      const workingDay = await prisma.workingDay.findFirst({
        where: {
          agencyId,
          day: safeDayName,
        },
      });

      const isLate = workingDay && !workingDay.isClosed
        ? checkIfLate(workingDay.openTime)
        : false;

      // Create attendance log
      const log = await prisma.attendanceLog.create({
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
      await prisma.notification.create({
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
    }

    // ─── Check Out ────────────────────────────────────────────────────────────
    if (action === "check-out") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const log = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
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
      const workingDay = await prisma.workingDay.findFirst({
        where: {
          agencyId,
          day: safeDayName,
        },
      });

      const isEarlyOut = workingDay && !workingDay.isClosed
        ? checkIfEarlyOut(workingDay.closeTime, checkOutTime)
        : false;

      // Update log
      const updatedLog = await prisma.attendanceLog.update({
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
      await prisma.notification.create({
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
    }

    // ─── Midnight Shift ──────────────────────────────────────────────────────
    if (action === "midnight-shift") {
      if (!logId) {
        return NextResponse.json(
          { error: "Log ID is required for midnight shift" },
          { status: 400 }
        );
      }

      const result = await AttendanceService.handleMidnightShift(logId);

      return NextResponse.json({
        success: true,
        message: "Midnight shift processed successfully",
        data: result,
      });
    }

    // ─── Overlap ──────────────────────────────────────────────────────────────
    if (action === "overlap") {
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
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: check-in, check-out, midnight-shift, overlap" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("[POST_ATTENDANCE_ERROR]:", error);
    
    if (error.message === "You are already checked in") {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message === "No active check-in found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process attendance action" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/attendance ──────────────────────────────────────────────────
// For admin/manual deletion (optional)

export const DELETE = withAuthGuard("attendance:manage", async (
  req: NextRequest,
  { userId, agencyId }
) => {
  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get("logId");

    if (!logId) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    // Verify log belongs to the user/agency
    const log = await prisma.attendanceLog.findFirst({
      where: {
        id: logId,
        userId,
        agencyId,
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "Attendance log not found" },
        { status: 404 }
      );
    }

    // Delete the log
    await prisma.attendanceLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance log deleted successfully",
    });

  } catch (error: any) {
    console.error("[DELETE_ATTENDANCE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete attendance log" },
      { status: 500 }
    );
  }
});