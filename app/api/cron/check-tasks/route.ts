// app/api/cron/check-tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  
  // Define start and end of tomorrow for "due tomorrow" check
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(now.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  try {
    // 1. Fetch tasks due tomorrow that are not completed/cancelled
    const dueTomorrowTasks = await db.task.findMany({
      where: {
        dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        deletedAt: null,
      },
      include: { assignees: true },
    });

    for (const task of dueTomorrowTasks) {
      for (const assignee of task.assignees) {
        // Optional: check if notification already sent to avoid duplicates
        await db.notification.create({
          data: {
            userId: assignee.id,
            agencyId: task.agencyId,
            title: "Task Due Tomorrow",
            message: `Task "${task.title}" (${task.taskNo}) is due tomorrow.`,
            type: "DEADLINE",
            actionUrl: `/dashboard/tasks/${task.id}`,
          },
        });
      }
    }

    // 2. Fetch overdue tasks (dueDate < today and status not completed/cancelled)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const overdueTasks = await db.task.findMany({
      where: {
        dueDate: { lt: todayStart },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        deletedAt: null,
        isNotified: false, // Flag to prevent spamming daily if desired
      },
      include: { assignees: true },
    });

    for (const task of overdueTasks) {
      for (const assignee of task.assignees) {
        await db.notification.create({
          data: {
            userId: assignee.id,
            agencyId: task.agencyId,
            title: "Task Overdue",
            message: `Task "${task.title}" (${task.taskNo}) is now overdue!`,
            type: "ALERT",
            actionUrl: `/dashboard/tasks/${task.id}`,
          },
        });
      }

      // Mark task as notified for overdue to prevent repeat notifications every single hour/day
      await db.task.update({
        where: { id: task.id },
        data: { isNotified: true },
      });
    }

    return NextResponse.json({ success: true, dueTomorrowCount: dueTomorrowTasks.length, overdueCount: overdueTasks.length });
  } catch (err: any) {
    console.error("Cron job error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}