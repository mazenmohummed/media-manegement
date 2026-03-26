import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Fetch Production Tasks
    const tasks = await prisma.task.findMany({
      include: { project: true, assignee: true },
    });

    // 2. Fetch Attendance Logs
    const attendance = await prisma.attendanceLog.findMany({
      include: { user: true },
    });

    // 3. Fetch Team Leaves (Nested in User model)
    const usersWithLeaves = await prisma.user.findMany({
      select: { name: true, leaves: true },
    });

    // Format Tasks
    const taskEvents = tasks.map((t) => ({
      id: `task-${t.id}`,
      title: `PROD: ${t.project.projectName} - ${t.taskType}`,
      start: new Date(t.startDate),
      end: new Date(t.endDate),
      resource: { type: "TASK", status: t.status, assignee: t.assignee?.name },
    }));

    // Format Attendance
    const attendanceEvents = attendance.map((a) => ({
      id: `att-${a.id}`,
      title: `IN: ${a.user.name}`,
      start: new Date(a.checkInTime),
      end: new Date(a.checkOutTime),
      resource: { type: "ATTENDANCE", status: a.status },
    }));

    // Format Leaves
    const leaveEvents = usersWithLeaves.flatMap((u) =>
      u.leaves.map((l, index) => ({
        id: `leave-${u.name}-${index}`,
        title: `LEAVE: ${u.name} (${l.type})`,
        start: new Date(l.startDate!),
        end: new Date(l.endDate!),
        resource: { type: "LEAVE", status: l.status },
      }))
    );

    return NextResponse.json([...taskEvents, ...attendanceEvents, ...leaveEvents]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync calendar" }, { status: 500 });
  }
}