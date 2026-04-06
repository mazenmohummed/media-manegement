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

  // 2. BASE RESPONSE WITH WORKING HOURS FALLBACK
  const baseResponse = {
    agencyName: user.agency.agencyName,
    address: user.agency.address,
    latitude: user.agency.latitude,
    longitude: user.agency.longitude,
    radius: user.agency.radius,
    subscription: user.agency.subscription,
    // Fix for empty UI card:
    workingHours: user.agency.workingHours.length > 0 
      ? user.agency.workingHours 
      : DEFAULT_WORKING_HOURS,
  };

  if (isAdmin) {
    const [
      clientsCount,
      projects,
      tasks,
      allUsers,
      payouts,
      notifications,
    ] = await Promise.all([
      prisma.client.count({ where: { agencyId } }),
      prisma.project.findMany({ where: { agencyId } }),
      prisma.task.findMany({
        where: { agencyId },
        include: { taskExpenses: true }
      }),
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

    // --- EMPLOYEE PERFORMANCE AGGREGATION ---
    const employeePerformance = allUsers.map(u => {
      const totalUserRevenue = u.tasks.reduce((acc, t) => acc + (t.internalCost ?? 0), 0);
      const totalUserPayouts = u.payouts.reduce((acc, p) => acc + (p.amount ?? 0), 0);
      const lateDays = u.attendanceLogs.filter(log => log.isLate).length;
      const workingHours = u.attendanceLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);

      const userTaskExpenses = u.tasks.reduce((acc, t) => {
        const expenseSum = (t.taskExpenses ?? []).reduce((sum, exp) => sum + (exp.cost ?? 0), 0);
        return acc + expenseSum;
      }, 0);

      const activeLeaves = (u.leaves ?? []).filter(l => l.status === "APPROVED").length;

      return {
        name: u.name,
        role: u.role,
        tasksCount: u.tasks.length,
        tasksCompleted: u.tasks.filter(t => t.status === "Completed").length,
        revenueGenerated: totalUserRevenue.toLocaleString(),
        workingHours: workingHours.toFixed(1),
        lateDays,
        baseSalary: (u.salary ?? 0).toLocaleString(),
        extraPayouts: totalUserPayouts.toLocaleString(),
        expenses: userTaskExpenses.toLocaleString(),
        efficiency: (u.efficiencyRate ?? 1.0),
        skills: u.verifiedSkills ?? [],
        activeLeaves
      };
    });

    // --- FINANCIAL TOTALS ---
    const totalRevenue = projects.reduce((acc, p) => acc + (p.totalValue ?? 0), 0);
    const totalUserSalary = allUsers.reduce((acc, u) => acc + (u.salary ?? 0), 0);
    const totalTaskExpenses = tasks.reduce((acc, task) => {
      const taskExpenseSum = (task.taskExpenses ?? []).reduce((sum, exp) => sum + (exp.cost ?? 0), 0);
      return acc + taskExpenseSum;
    }, 0);
    const totalPayouts = payouts.reduce((acc, p) => acc + (p.amount ?? 0), 0);

    const totalCombinedExpenses = totalTaskExpenses + totalPayouts;
    const netProfit = tasks.reduce((acc, t) => acc + (t.taskNetProfit ?? 0), 0);

    const avgMargin = tasks.length > 0
      ? (tasks.reduce((acc, t) => acc + (t.margin ?? 0), 0) / tasks.length).toFixed(1)
      : 0;

    return NextResponse.json({
      ...baseResponse,
      notifications,
      employeePerformance,
      stats: {
        totalClients: clientsCount,
        totalProjects: projects.length,
        totalTasks: tasks.length,
        revenue: (totalRevenue ?? 0).toLocaleString(),
        totalUserSalary: (totalUserSalary ?? 0).toLocaleString(),
        totalPayouts: (totalPayouts ?? 0).toLocaleString(),
        totalTaskExpenses: (totalTaskExpenses ?? 0).toLocaleString(),
        expenses: (totalCombinedExpenses ?? 0).toLocaleString(),
        netProfit: (netProfit ?? 0).toLocaleString(),
        avgMargin,
        totalWorkingHours: tasks.reduce((acc, t) => acc + (t.actualHours ?? 0), 0).toFixed(1),
      }
    });
  } else {
    // --- EMPLOYEE DATA ---
    const [userTasks, userLogs, userPayouts, notifications] = await Promise.all([
      prisma.task.findMany({ where: { assigneeId: userId } }),
      prisma.attendanceLog.findMany({ where: { userId } }),
      prisma.payout.findMany({ where: { userId } }),
      prisma.notification.findMany({
        where: { userId, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const totalHours = userLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);
    const lateLogs = userLogs.filter(log => log.isLate).length;
    const efficiencyRate = userLogs.length > 0 ? (userLogs.length - lateLogs) / userLogs.length : 1.0;

    return NextResponse.json({
      ...baseResponse,
      notifications,
      stats: {
        totalClients: new Set(userTasks.map(t => t.projectId)).size,
        totalProjects: new Set(userTasks.map(t => t.projectId)).size,
        totalTasks: userTasks.length,
        totalPayouts: userPayouts.reduce((acc, p) => acc + (p.amount ?? 0), 0).toLocaleString(),
        totalWorkingHours: totalHours.toFixed(1),
        efficiencyRate,
        lateCount: lateLogs
      }
    });
  }
}