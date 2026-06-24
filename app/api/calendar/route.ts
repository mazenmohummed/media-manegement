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
        include: { user: true },
      }),
      prisma.user.findMany({
        where: { agencyId },
        select: { id: true, name: true, leaves: true },
      }),
    ]);

    const taskEvents = tasks.map((t) => ({
      id: `task-${t.id}`,
      title: `PROD: ${t.project.projectName} - ${t.taskType}`,
      start: new Date(t.startDate),
      end: new Date(t.endDate),
      allDay: true,
      resource: { 
        type: "TASK", 
        status: t.status, 
        assignee: t.assignees.length > 0 ? t.assignees.map(u => u.name).join(", ") : "Unassigned",
      },
    }));

    const attendanceEvents = attendance.map((a) => ({
      id: `att-${a.id}`,
      title: `IN: ${a.user.name}`,
      start: new Date(a.checkInTime),
      end: a.checkOutTime ? new Date(a.checkOutTime) : new Date(a.checkInTime),
      allDay: false,
      resource: { type: "ATTENDANCE", status: a.status },
    }));

    // CRITICAL FIX: Loop through leaves and strip out "REJECTED" statuses completely
    // Inside your GET handler for the calendar:
      const leaveEvents = usersWithLeaves.flatMap((u) =>
        u.leaves
          .filter((l) => l.status !== "Rejected") // FIX: match MongoDB "Rejected" casing
          .map((l, index) => ({
            id: `leave-${u.id}-${index}`, 
            title: `LEAVE: ${u.name} (${l.type})`,
            start: new Date(l.startDate!),
            end: new Date(l.endDate!),
            allDay: true,
            resource: { type: "LEAVE", status: l.status },
          }))
      );

    return NextResponse.json([...taskEvents, ...attendanceEvents, ...leaveEvents]);
  } catch (error) {
    console.error("CALENDAR_SYNC_ERROR:", error);
    return NextResponse.json({ error: "Failed to sync calendar pipeline" }, { status: 500 });
  }
}