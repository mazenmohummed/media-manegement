// app/api/calendar/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const agencyId = session.user.agencyId;

  try {
    const [tasks, attendance, usersWithLeaves] = await Promise.all([
      prisma.task.findMany({
        where: { agencyId },
        include: { project: true, assignees: true },
      }),
      prisma.attendanceLog.findMany({
        where: { agencyId },
        include: {
          user: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { agencyId },
        select: { id: true, name: true, leaves: true },
      }),
    ]);

    // ✅ Skip tasks missing a startDate, since FullCalendar requires one
    const taskEvents = tasks
      .filter((t) => t.startDate != null)
      .map((t) => ({
        id: `task-${t.id}`,
        title: `PROD: ${t.project.projectName} - ${t.taskType}`,
        // ✅ t.startDate is now narrowed to `Date`
        start: t.startDate,
        // ✅ Fall back to start if endDate is null
        end: t.endDate ?? t.startDate,
        allDay: true,
        resource: {
          type: "TASK",
          status: t.status,
          assignee:
            t.assignees.length > 0
              ? t.assignees.map((u) => u.name).join(", ")
              : "Unassigned",
        },
      }));

    const attendanceEvents = attendance.map((a: any) => {
      const dynamicTaskName = a.task?.project?.projectName
        ? `${a.task.project.projectName} - ${a.task.taskType}`
        : null;

      return {
        id: `att-${a.id}`,
        title: `IN: ${a.user.name}`,
        start: new Date(a.checkInTime),
        end: a.checkOutTime ? new Date(a.checkOutTime) : new Date(a.checkInTime),
        allDay: false,
        resource: {
          type: "ATTENDANCE",
          status: a.status,
          method: a.checkInLocation ?? a.type,
          totalHours: a.totalHours,
          isLate: a.isLate,
          checkOutTime: a.checkOutTime,
          taskId: a.taskId || null,
          taskName: dynamicTaskName,
          taskStartDate: a.task?.startDate || null,
          taskEndDate: a.task?.endDate || null,
        },
      };
    });

    // ✅ Filter leaves with valid start/end before constructing Dates
    const leaveEvents = usersWithLeaves.flatMap((u) =>
      u.leaves
        .filter(
          (l) =>
            l.status !== "Rejected" &&
            l.startDate != null &&
            l.endDate != null
        )
        .map((l, index) => ({
          id: `leave-${u.id}-${index}`,
          title: `LEAVE: ${u.name} (${l.type})`,
          start: l.startDate as Date,
          end: l.endDate as Date,
          allDay: true,
          resource: { type: "LEAVE", status: l.status },
        }))
    );

    return NextResponse.json([
      ...taskEvents,
      ...attendanceEvents,
      ...leaveEvents,
    ]);
  } catch (error) {
    console.error("CALENDAR_SYNC_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar pipeline" },
      { status: 500 }
    );
  }
}