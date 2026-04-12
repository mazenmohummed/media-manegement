import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // 1. SECURITY: Block anyone without a valid session or agencyId
  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const agencyId = session.user.agencyId;

  try {
    // 2. FETCH DATA (All scoped by agencyId)
    const [tasks, attendance, usersWithLeaves] = await Promise.all([
      // Fetch Production Tasks with their assigned creatives
      prisma.task.findMany({
        where: { agencyId },
        include: { 
          project: true, 
          assignees: true // Plural to match your many-to-many schema
        },
      }),
      
      // Fetch Attendance Logs for office presence
      prisma.attendanceLog.findMany({
        where: { agencyId },
        include: { user: true },
      }),
      
      // Fetch Team Leaves
      prisma.user.findMany({
        where: { agencyId },
        select: { name: true, leaves: true },
      }),
    ]);

    // 3. FORMAT TASKS
    const taskEvents = tasks.map((t) => ({
      id: `task-${t.id}`,
      title: `PROD: ${t.project.projectName} - ${t.taskType}`,
      start: new Date(t.startDate),
      end: new Date(t.endDate),
      allDay: true,
      resource: { 
        type: "TASK", 
        status: t.status, 
        // Handles multiple creatives on one shoot/task
        assignee: t.assignees.length > 0 
          ? t.assignees.map(u => u.name).join(", ") 
          : "Unassigned",
        color: "#2563eb" 
      },
    }));

    // 4. FORMAT ATTENDANCE
    const attendanceEvents = attendance.map((a) => ({
      id: `att-${a.id}`,
      title: `IN: ${a.user.name}`,
      start: new Date(a.checkInTime),
      end: a.checkOutTime ? new Date(a.checkOutTime) : new Date(a.checkInTime),
      allDay: false,
      resource: { 
        type: "ATTENDANCE", 
        status: a.status,
        color: "#16a34a" 
      },
    }));

    // 5. FORMAT LEAVES
    const leaveEvents = usersWithLeaves.flatMap((u) =>
      u.leaves.map((l, index) => ({
        id: `leave-${u.name}-${index}`,
        title: `LEAVE: ${u.name} (${l.type})`,
        start: new Date(l.startDate!),
        end: new Date(l.endDate!),
        allDay: true,
        resource: { 
          type: "LEAVE", 
          status: l.status,
          color: "#dc2626" 
        },
      }))
    );

    // Combine all production, attendance, and leave data for the Master Calendar
    return NextResponse.json([...taskEvents, ...attendanceEvents, ...leaveEvents]);

  } catch (error) {
    console.error("CALENDAR_SYNC_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" }, 
      { status: 500 }
    );
  }
}