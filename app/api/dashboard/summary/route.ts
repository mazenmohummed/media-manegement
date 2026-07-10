import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId   = session.user.id   as string;
    const agencyId = session.user.agencyId as string;
    const role     = session.user.role as string;
    const isAdmin  = role === "ADMIN" || role === "SUPERADMIN";

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const [
      agency,             //  1
      totalClients,       //  2
      totalProjects,      //  3
      totalTasks,         //  4
      payments,           //  5
      allPayouts,         //  6
      taskExpenses,       //  7
      users,              //  8
      allAttendanceLogs,  //  9
      notifications,      // 10
      userAttendanceStats,// 11  all-time logs for current user (stats only)
      userPayouts,        // 12  current user's payouts (for pending payout calc)
      recentPayoutsRaw,   // 13
      recentAttendanceRaw,// 14
      todaysAttendance,   // 15
      userAttendance,     // 16  today's OFFICE log for check-in button
      taskSessions,       // 17  today's task sessions for current user
    ] = await Promise.all([

      /* 1 */ prisma.agency.findUnique({
        where: { id: agencyId },
        include: { subscription: true },
      }),

      /* 2 */ prisma.client.count({ where: { agencyId } }),
      /* 3 */ prisma.project.count({ where: { agencyId } }),
      /* 4 */ prisma.task.count({
        where: { agencyId, status: { in: ["PENDING", "ACTIVE"] } },
      }),

      /* 5 */ prisma.payment.findMany({
        where: { agencyId },
        select: { amount: true },
      }),

      /* 6 */ prisma.payout.findMany({
        where: { agencyId },
        select: { amount: true, userId: true },
      }),

      /* 7 */ prisma.taskExpense.findMany({
        where: { agencyId },
        select: { cost: true },
      }),

      /* 8 */ prisma.user.findMany({
        where: { agencyId },
        select: {
          id: true,
          name: true,
          role: true,
          baseSalary: true,
          walletBalance: true,
          efficiencyRate: true,
          attendanceLogs: {
            where: { agencyId },
            select: { totalHours: true, isLate: true },
          },
        },
      }),

      /* 9 */ prisma.attendanceLog.findMany({
        where: { agencyId },
        select: { totalHours: true, isLate: true },
      }),

      /* 10 */ prisma.notification.findMany({
        where: {
          agencyId,
          ...(isAdmin ? {} : { userId }),
          isRead: false,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, title: true, message: true, type: true, createdAt: true, isRead: true,
        },
      }),
      /* 11 */ prisma.attendanceLog.findMany({
        where: { agencyId, userId },
        select: { totalHours: true, isLate: true },
      }),

      /* 12 */ prisma.payout.findMany({
        where: { agencyId, userId },
        select: { amount: true },
      }),

      /* 13 */ prisma.payout.findMany({
        where: { agencyId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, amount: true, category: true, status: true,
          date: true, description: true,
          user: { select: { id: true, name: true, role: true } },
        },
      }),

      /* 14 */ prisma.attendanceLog.findMany({
        where: { agencyId },
        orderBy: { checkInTime: "desc" },
        take: 10,
        select: {
          id: true,
          checkInTime: true,
          checkOutTime: true,
          totalHours: true,
          isLate: true,
          status: true,
          type: true,
          user: { select: { id: true, name: true, role: true } },
          // task relation is optional on AttendanceLog — guard with null coalesce in map
          task: { select: { id: true, taskType: true } },
        },
      }),

      /* 15 */ prisma.attendanceLog.findMany({
        where: { agencyId, checkInTime: { gte: todayMidnight } },
        include: { user: { select: { name: true } } },
      }),

      /* 16 */ prisma.attendanceLog.findFirst({
        where: {
          userId,
          agencyId,
          type: "OFFICE",
          date: todayMidnight,
        },
        select: {
          id: true,
          checkInTime: true,
          checkOutTime: true,
          isLate: true,
          status: true,
          totalHours: true,
        },
      }),

      /* 17 — FIX: Task has no "title" field; use taskNo + taskType instead */
       prisma.taskSession.findMany({
        where: { 
          userId,
          startTime: { gte: todayMidnight }
        },
        include: {
          task: { 
            include: { 
              project: { select: { projectName: true } } 
            }
          },
          user: { select: { name: true } } // Fetch user name
        },
        orderBy: { startTime: 'desc' }
      }),
          ]);

    // ── Financial Calculations ────────────────────────────────────────────────
    const revenue           = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const totalPayouts      = allPayouts.reduce((s, p) => s + (p.amount ?? 0), 0);
    const totalTaskExpenses = taskExpenses.reduce((s, e) => s + (e.cost ?? 0), 0);
    const totalUserSalary   = users.reduce((s, u) => s + (u.baseSalary ?? 0), 0);
    const expenses          = totalPayouts + totalTaskExpenses;
    const netProfit         = revenue - expenses - totalUserSalary;
    const avgMargin         = revenue > 0
      ? (((revenue - expenses) / revenue) * 100).toFixed(1)
      : "0";

    // ── Attendance Stats ──────────────────────────────────────────────────────
    const agencyTotalHours = allAttendanceLogs.reduce((s, l) => s + (l.totalHours ?? 0), 0);
    const agencyLateCount  = allAttendanceLogs.filter((l) => l.isLate).length;
    const userTotalHours   = userAttendanceStats.reduce((s, l) => s + (l.totalHours ?? 0), 0);
    const userLateCount    = userAttendanceStats.filter((l) => l.isLate).length;

    // ── Current user's pending payout total (slot 12) ─────────────────────────
    const userPendingPayout = userPayouts.reduce((s, p) => s + (p.amount ?? 0), 0);

    const currentUser    = users.find((u) => u.id === userId);
    const efficiencyRate = currentUser?.efficiencyRate ?? 1.0;

    // ── Employee Performance (admin only) ─────────────────────────────────────
    const employeePerformance = isAdmin
      ? users.map((u) => {
          const hours      = u.attendanceLogs.reduce((s, l) => s + (l.totalHours ?? 0), 0);
          const late       = u.attendanceLogs.filter((l) => l.isLate).length;
          const userPayout = allPayouts
            .filter((p) => p.userId === u.id)
            .reduce((s, p) => s + (p.amount ?? 0), 0);
          return {
            id:             u.id,
            name:           u.name,
            role:           u.role,
            totalHours:     parseFloat(hours.toFixed(1)),
            lateCount:      late,
            efficiencyRate: u.efficiencyRate ?? 1.0,
            salary:         u.baseSalary    ?? 0,
            userWallet:     u.walletBalance ?? 0,
            totalPayout:    userPayout,
          };
        })
      : undefined;

    const workingHours = (agency as any)?.workingHours ?? [];

    return NextResponse.json({
      // Agency identity
      address:      agency?.address      ?? null,
      latitude:     agency?.latitude     ?? null,
      longitude:    agency?.longitude    ?? null,
      radius:       agency?.radius       ?? 100,
      agencyName:   (agency as any)?.agencyName   ?? null,
      operatorName: (agency as any)?.operatorName ?? null,
      email:        (agency as any)?.email        ?? null,

      workingHours,

      subscription: agency?.subscription
        ? {
            plan:              agency.subscription.plan,
            status:            agency.subscription.status,
            maxUsers:          agency.subscription.maxUsers,
            geoFencingEnabled: agency.subscription.geoFencingEnabled,
          }
        : null,

      stats: {
        totalClients,
        totalProjects,
        totalTasks,
        revenue:           revenue.toFixed(2),
        netProfit:         netProfit.toFixed(2),
        totalPayouts:      isAdmin
          ? totalPayouts.toFixed(2)
          : userPendingPayout.toFixed(2),
        totalTaskExpenses: totalTaskExpenses.toFixed(2),
        expenses:          expenses.toFixed(2),
        totalUserSalary:   totalUserSalary.toFixed(2),
        avgMargin,
        totalWorkingHours: parseFloat(
          (isAdmin ? agencyTotalHours : userTotalHours).toFixed(1)
        ),
        lateCount:     isAdmin ? agencyLateCount : userLateCount,
        efficiencyRate,
      },

      notifications,

      recentPayouts: recentPayoutsRaw.map((p) => ({
        id:          p.id,
        amount:      p.amount,
        category:    p.category,
        status:      p.status,
        date:        p.date,
        description: p.description,
        userName:    p.user?.name ?? "System / Deleted User",
        userRole:    p.user?.role ?? null,
        userId:      p.user?.id  ?? null,
      })),

      recentAttendance: recentAttendanceRaw.map((a) => ({
        id:           a.id,
        checkInTime:  a.checkInTime,
        checkOutTime: a.checkOutTime,
        totalHours:   a.totalHours,
        isLate:       a.isLate,
        status:       a.status,
        type:         a.type,
        userName:     a.user?.name ?? "Unknown",
        userRole:     a.user?.role ?? null,
        userId:       a.user?.id  ?? null,
        taskType:     (a as any).task?.taskType ?? null,
        taskId:       (a as any).task?.id       ?? null,
      })),

      // Today's office check-in state for the check-in button
      userAttendance,
      todaysAttendance: todaysAttendance ?? [],

      // Today's task sessions for current user — FIX: taskNo/taskType not title
      taskSessions: taskSessions.map((ts) => ({
      id:            ts.id,
      startTime:     ts.startTime,
      endTime:       ts.endTime,
      totalDuration: ts.totalDuration,
      sessionType:   ts.sessionType,
      projectName:   (ts.task as any)?.project?.projectName ?? "No Project",
      taskType:      (ts.task as any)?.taskType ?? "STANDARD",
      userName:      ts.user?.name ?? "Unknown User" // New field
    })),

      employeePerformance: employeePerformance ?? null,
    });
  } catch (error) {
    console.error("[DASHBOARD_SUMMARY]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}