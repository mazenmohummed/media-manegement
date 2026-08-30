// lib/services/attendance.service.ts
import { db } from "@/lib/db";
import { addHours, differenceInHours, differenceInMinutes, startOfDay, endOfDay } from "date-fns";

export class AttendanceService {
  /**
   * Handle missed checkout - auto checkout after a certain period
   */
  static async handleMissedCheckout() {
    // Find all attendance logs with no checkout time from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openLogs = await db.attendanceLog.findMany({
      where: {
        date: { gte: today },
        checkOutTime: null,
      },
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

    const now = new Date();
    const results = [];

    for (const log of openLogs) {
      const hoursSinceCheckin = differenceInHours(now, new Date(log.checkInTime));
      
      // If more than 12 hours since check-in, auto checkout
      if (hoursSinceCheckin >= 12) {
        const updated = await db.attendanceLog.update({
          where: { id: log.id },
          data: {
            checkOutTime: now,
            totalHours: differenceInHours(now, new Date(log.checkInTime)),
            status: "OUT_OF_OFFICE",
          },
        });

        // Create notification about auto-checkout
        await db.notification.create({
          data: {
            userId: log.userId,
            agencyId: log.agencyId,
            title: "Auto Checkout Applied",
            message: `Your attendance was automatically checked out after ${hoursSinceCheckin} hours.`,
            type: "WARNING",
          },
        });

        results.push(updated);
      }
    }

    return results;
  }

  /**
   * Handle midnight-crossing shifts (shifts that span across midnight)
   */
  static async handleMidnightShift(logId: string) {
    const log = await db.attendanceLog.findUnique({
      where: { id: logId },
    });

    if (!log) throw new Error("Attendance log not found");

    const checkIn = new Date(log.checkInTime);
    const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : new Date();

    // Calculate total hours crossing midnight
    let totalHours = differenceInHours(checkOut, checkIn);
    
    // If shift crosses midnight, adjust for proper duration
    if (checkOut < checkIn) {
      // Shift crosses midnight
      const midnight = new Date(checkIn);
      midnight.setHours(24, 0, 0, 0);
      const hoursToMidnight = differenceInHours(midnight, checkIn);
      const hoursAfterMidnight = differenceInHours(checkOut, new Date(checkOut.setHours(0, 0, 0, 0)));
      totalHours = hoursToMidnight + hoursAfterMidnight;
    }

    // Check if it's a night shift (after 10 PM)
    const isNightShift = checkIn.getHours() >= 22 || checkIn.getHours() < 6;

    await db.attendanceLog.update({
      where: { id: logId },
      data: {
        totalHours,
        type: isNightShift ? "REMOTE" : "OFFICE",
        status: totalHours >= 8 ? "PRESENT" : "PRESENT",
      },
    });

    return { logId, totalHours, isNightShift };
  }

  /**
   * Detect and handle overlapping attendance logs
   */
  static async handleOverlappingLogs(userId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await db.attendanceLog.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { checkInTime: "asc" },
    });

    if (logs.length <= 1) return logs;

    // Check for overlapping logs and merge them
    const mergedLogs = [];
    let currentLog = logs[0];

    for (let i = 1; i < logs.length; i++) {
      const nextLog = logs[i];
      const currentCheckOut = currentLog.checkOutTime 
        ? new Date(currentLog.checkOutTime) 
        : new Date(currentLog.checkInTime);
      const nextCheckIn = new Date(nextLog.checkInTime);

      // If logs overlap, merge them
      if (nextCheckIn <= currentCheckOut) {
        // Extend current log to the later checkout time
        const newCheckOut = nextLog.checkOutTime 
          ? new Date(Math.max(currentCheckOut.getTime(), new Date(nextLog.checkOutTime).getTime()))
          : null;

        await db.attendanceLog.update({
          where: { id: currentLog.id },
          data: {
            checkOutTime: newCheckOut,
            totalHours: newCheckOut 
              ? differenceInHours(newCheckOut, new Date(currentLog.checkInTime))
              : null,
          },
        });

        // Delete the overlapping log
        await db.attendanceLog.delete({
          where: { id: nextLog.id },
        });

        // Update current log's checkout time in the array
        currentLog.checkOutTime = newCheckOut ? newCheckOut : null;
      } else {
        // No overlap, move to next log
        mergedLogs.push(currentLog);
        currentLog = nextLog;
      }
    }

    mergedLogs.push(currentLog);
    return mergedLogs;
  }

  /**
   * Calculate weekly attendance summary with edge cases
   */
  static async getWeeklySummary(userId: string, weekStart: Date) {
    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const logs = await db.attendanceLog.findMany({
      where: {
        userId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    let totalHours = 0;
    let lateDays = 0;
    let presentDays = 0;
    let absentDays = 0;

    // Get working hours configuration
    const agency = await db.agency.findFirst({
      where: { users: { some: { id: userId } } },
      include: { workingHours: true },
    });

    const workingDays = agency?.workingHours || [];

    // Process each day of the week
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayName = day.toLocaleDateString("en-US", { weekday: "long" });

      // Check if it's a working day
      const workingDay = workingDays.find((wd) => wd.day === dayName);
      if (workingDay?.isClosed) {
        // Skip non-working days
        continue;
      }

      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate.toDateString() === day.toDateString();
      });

      if (dayLogs.length === 0) {
        absentDays++;
        continue;
      }

      presentDays++;
      
      // Check for late arrival
      const firstLog = dayLogs[0];
      const checkInTime = new Date(firstLog.checkInTime);
      const expectedStart = new Date(day);
      const [hours, minutes] = (workingDay?.openTime || "09:00").split(":").map(Number);
      expectedStart.setHours(hours, minutes, 0, 0);

      if (checkInTime > expectedStart) {
        lateDays++;
      }

      // Sum total hours for the day
      const dayTotal = dayLogs.reduce((sum, log) => {
        return sum + (log.totalHours || 0);
      }, 0);
      totalHours += dayTotal;
    }

    return {
      totalHours,
      lateDays,
      presentDays,
      absentDays,
      totalDays: presentDays + absentDays,
      attendanceRate: presentDays + absentDays > 0 
        ? (presentDays / (presentDays + absentDays)) * 100 
        : 0,
    };
  }

  /**
   * Get today's attendance for a user
   */
  static async getTodayAttendance(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const log = await db.attendanceLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            taskNo: true,
          },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    return log;
  }

  /**
   * Get attendance for a date range
   */
  static async getAttendanceRange(userId: string, startDate: Date, endDate: Date) {
    const logs = await db.attendanceLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
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

    return logs;
  }

  /**
   * Get attendance statistics for a user
   */
  static async getUserAttendanceStats(userId: string, startDate: Date, endDate: Date) {
    const logs = await db.attendanceLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = logs.length;
    const totalHours = logs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const lateDays = logs.filter((log) => log.isLate).length;
    const presentDays = logs.filter((log) => log.status === "PRESENT").length;
    const absentDays = totalDays - presentDays;

    return {
      totalDays,
      totalHours,
      lateDays,
      presentDays,
      absentDays,
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
    };
  }

  /**
   * Check in a user
   */
  static async checkIn(
    userId: string,
    agencyId: string,
    location?: { lat: number; lng: number }
  ) {
    // Check if user is already checked in
    const existing = await this.getTodayAttendance(userId);
    if (existing && existing.checkOutTime === null) {
      throw new Error("You are already checked in");
    }

    const now = new Date();
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);

    // Get working hours to check if late
    const agency = await db.agency.findUnique({
      where: { id: agencyId },
      include: { workingHours: true },
    });

    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const workingDay = agency?.workingHours?.find((wh) => wh.day === dayName);
    
    let isLate = false;
    if (workingDay && !workingDay.isClosed) {
      const [openHours, openMinutes] = workingDay.openTime.split(":").map(Number);
      const expectedStart = new Date(now);
      expectedStart.setHours(openHours, openMinutes, 0, 0);
      isLate = now > expectedStart;
    }

    // Verify geofence if location is provided
    if (location && agency?.latitude && agency?.longitude && agency?.radius) {
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        agency.latitude,
        agency.longitude
      );
      
      if (distance > agency.radius) {
        throw new Error(`You are outside the geofence (${distance.toFixed(0)}m away)`);
      }
    }

    const log = await db.attendanceLog.create({
      data: {
        userId,
        agencyId,
        checkInTime: now,
        date: date,
        isLate,
        status: "PRESENT",
        type: "OFFICE",
        ...(location && {
          checkInLatitude: location.lat,
          checkInLongitude: location.lng,
        }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
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
        message: `${log.user.name} checked in${isLate ? ' (LATE)' : ''} at ${now.toLocaleTimeString()}`,
        type: "ATTENDANCE",
      },
    });

    return log;
  }

  /**
   * Check out a user
   */
  static async checkOut(userId: string, location?: { lat: number; lng: number }) {
    const log = await this.getTodayAttendance(userId);
    if (!log) {
      throw new Error("No active check-in found");
    }
    if (log.checkOutTime !== null) {
      throw new Error("You are already checked out");
    }

    const now = new Date();
    const checkInTime = new Date(log.checkInTime);
    const totalHours = differenceInHours(now, checkInTime);

    const updated = await db.attendanceLog.update({
      where: { id: log.id },
      data: {
        checkOutTime: now,
        totalHours,
        status: totalHours >= 8 ? "PRESENT" : "PRESENT",
        ...(location && {
          checkOutLatitude: location.lat,
          checkOutLongitude: location.lng,
        }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        agencyId: log.agencyId,
        title: "Attendance Checked Out",
        message: `${updated.user.name} checked out after ${totalHours.toFixed(1)} hours`,
        type: "ATTENDANCE",
      },
    });

    return updated;
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

// ─── Scheduled Job for Auto Checkout ────────────────────────────────────────
// This should be run via a cron job or scheduled function

export async function runAutoCheckoutJob() {
  try {
    const results = await AttendanceService.handleMissedCheckout();
    console.log(`Auto-checkout completed. ${results.length} records updated.`);
    return results;
  } catch (error) {
    console.error("Auto-checkout job failed:", error);
    throw error;
  }
}