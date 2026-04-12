import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { startOfDay, addDays } from "date-fns";

// 1. DEFAULT FALLBACK FOR NEW AGENCIES
const DEFAULT_WORKING_HOURS = [
  { day: "Monday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Tuesday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Wednesday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Thursday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Friday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Saturday", openTime: "09:00", closeTime: "17:00", isClosed: true },
  { day: "Sunday", openTime: "09:00", closeTime: "17:00", isClosed: true },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Use a try-catch to handle the DB timeout gracefully
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: {
          include: { subscription: true }
        }
      },
    });

    if (!user || !user.agency) {
      return NextResponse.json({ error: "Agency node not found" }, { status: 404 });
    }

    const agencyId = user.agencyId;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
    const today = startOfDay(new Date());
    const tomorrowEnd = addDays(today, 2);

    const baseResponse = {
      agencyName: user.agency.agencyName,
      address: user.agency.address,
      latitude: user.agency.latitude,
      longitude: user.agency.longitude,
      radius: user.agency.radius,
      subscription: user.agency.subscription,
      workingHours: user.agency.workingHours.length > 0 
        ? user.agency.workingHours 
        : DEFAULT_WORKING_HOURS,
    };

    if (isAdmin) {
      const [clientsCount, projects, tasks, allUsers, payouts, notifications] = await Promise.all([
        prisma.client.count({ where: { agencyId } }),
        prisma.project.findMany({ where: { agencyId }, include: { tasks: true } }),
        prisma.task.findMany({ where: { agencyId }, include: { taskExpenses: true } }),
        prisma.user.findMany({
          where: { agencyId },
          include: {
            tasks: { include: { taskExpenses: true } },
            attendanceLogs: true,
            payouts: true
          }
        }),
        prisma.payout.findMany({ where: { agencyId } }),
        prisma.notification.findMany({
          where: { agencyId, createdAt: { gte: today, lt: tomorrowEnd } },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const employeePerformance = allUsers.map(u => {
        const totalUserRevenue = u.tasks.reduce((acc, t) => acc + (t.internalCost ?? 0), 0);
        const totalUserPayouts = u.payouts.reduce((acc, p) => acc + (p.amount ?? 0), 0);
        const lateDays = u.attendanceLogs.filter(log => log.isLate).length;
        const workingHours = u.attendanceLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);

        // FIX: Compare against the TaskStatus Enum instead of string "Completed"
        const completedTasksCount = u.tasks.filter(t => t.status === "COMPLETED").length;

        return {
          name: u.name,
          role: u.role,
          tasksCount: u.tasks.length,
          tasksCompleted: completedTasksCount,
          revenueGenerated: totalUserRevenue.toLocaleString(),
          workingHours: workingHours.toFixed(1),
          lateDays,
          baseSalary: (u.salary ?? 0).toLocaleString(),
          extraPayouts: totalUserPayouts.toLocaleString(),
          efficiency: (u.efficiencyRate ?? 1.0),
          skills: u.verifiedSkills ?? [],
        };
      });

      // Financial calculations...
      const totalRevenue = projects.reduce((acc, p) => acc + (p.totalValue ?? 0), 0);
      const netProfit = tasks.reduce((acc, t) => acc + (t.taskNetProfit ?? 0), 0);

      return NextResponse.json({
        ...baseResponse,
        notifications,
        employeePerformance,
        stats: {
          totalClients: clientsCount,
          totalProjects: projects.length,
          totalTasks: tasks.length,
          revenue: totalRevenue.toLocaleString(),
          netProfit: netProfit.toLocaleString(),
          // ... rest of your stats
        }
      });
    } else {
      // FIX: Use 'assigneeIds' with 'has' because it's a String[] in your schema
      const [userTasks, userLogs, userPayouts, notifications] = await Promise.all([
        prisma.task.findMany({ 
          where: { 
            assigneeIds: { has: userId } 
          } 
        }),
        prisma.attendanceLog.findMany({ where: { userId } }),
        prisma.payout.findMany({ where: { userId } }),
        prisma.notification.findMany({
          where: { userId, createdAt: { gte: today } },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return NextResponse.json({
        ...baseResponse,
        notifications,
        stats: {
          totalTasks: userTasks.length,
          totalWorkingHours: userLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0).toFixed(1),
          // ... rest of employee stats
        }
      });
    }
  } catch (dbError) {
    console.error("Database Connection Error:", dbError);
    return NextResponse.json({ error: "Service temporarily unavailable. Check DB connection." }, { status: 503 });
  }
}