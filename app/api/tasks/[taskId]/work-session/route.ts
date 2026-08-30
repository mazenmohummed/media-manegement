// app/api/tasks/[taskId]/work-session/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isWithinGeofence } from "@/lib/location-utils";

// POST: Start a work session on a task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const userId = session.user.id;
    const agencyId = session.user.agencyId;

    const body = await request.json().catch(() => ({}));
    const { latitude, longitude } = body as { latitude?: number; longitude?: number };

    // Get the task with assignees
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId,
      },
      include: {
        assignees: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user is assigned to this task
    const isAssigned = task.assignees.some((a) => a.id === userId);
    if (!isAssigned) {
      return NextResponse.json(
        { error: "You are not assigned to this task" },
        { status: 403 }
      );
    }

    // ── Geofence check ───────────────────────────────────────────────────
    // If the task has a location set, require the user's current
    // coordinates and confirm they're within the task's radius.
    if (task.latitude != null && task.longitude != null) {
      if (latitude == null || longitude == null) {
        return NextResponse.json(
          { error: "Location is required to start a work session for this task" },
          { status: 400 }
        );
      }

      const withinRange = isWithinGeofence(
        task.latitude,
        task.longitude,
        latitude,
        longitude,
        task.radius ?? 200
      );

      if (!withinRange) {
        return NextResponse.json(
          { error: "You must be at the task location to start a work session" },
          { status: 403 }
        );
      }
    }

    // Check if there's an active session for this task
    const activeSession = await db.taskSession.findFirst({
      where: {
        userId,
        taskId,
        endTime: null,
      },
    });

    if (activeSession) {
      return NextResponse.json(
        {
          error: "Already has an active session for this task",
          session: activeSession,
        },
        { status: 400 }
      );
    }

    // Check if user is checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceLog = await db.attendanceLog.findFirst({
      where: {
        userId,
        date: today,
        checkOutTime: null,
      },
    });

    if (!attendanceLog) {
      return NextResponse.json(
        { error: "Please check in before starting a task session" },
        { status: 400 }
      );
    }

    // Calculate hourly rate from user's base salary
    const user = await db.user.findFirst({
      where: { id: userId },
      select: { baseSalary: true },
    });

    const hourlyRate = user?.baseSalary ? user.baseSalary / 160 : 0; // 160 hours/month

    // Create the task session
    const taskSession = await db.taskSession.create({
      data: {
        startTime: new Date(),
        sessionType: "STANDARD",
        taskId,
        userId,
        attendanceLogId: attendanceLog.id,
        isBillable: true,
        hourlyRate: hourlyRate,
      },
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
                projectNo: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      session: taskSession,
    });
  } catch (error: any) {
    console.error("[WORK_SESSION_START_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start work session" },
      { status: 500 }
    );
  }
}

// PATCH: End a work session
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const userId = session.user.id;

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find the active session
    const taskSession = await db.taskSession.findFirst({
      where: {
        id: sessionId,
        userId,
        taskId,
        endTime: null,
      },
    });

    if (!taskSession) {
      return NextResponse.json(
        { error: "Active session not found" },
        { status: 404 }
      );
    }

    const endTime = new Date();
    const totalDuration = (endTime.getTime() - taskSession.startTime.getTime()) / (1000 * 60 * 60);

    // Update the session
    const updatedSession = await db.taskSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        totalDuration,
      },
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
                projectNo: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      totalDuration: totalDuration.toFixed(2),
    });
  } catch (error: any) {
    console.error("[WORK_SESSION_END_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to end work session" },
      { status: 500 }
    );
  }
}

// GET: Get task sessions for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const agencyId = session.user.agencyId;

    // Verify task belongs to agency
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId,
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const userIdParam = searchParams.get("userId");

    const whereClause: any = {
      taskId,
    };

    // ✅ Fix: Only add userId if it's a non-empty string
    if (userIdParam && userIdParam.trim() !== "") {
      whereClause.userId = userIdParam;
    }

    const sessions = await db.taskSession.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: limit,
    });

    // Calculate totals
    const totalSessions = sessions.length;
    const totalHours = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
    const totalCost = sessions.reduce((sum, s) => sum + ((s.totalDuration || 0) * (s.hourlyRate || 0)), 0);

    // Check for active session
    const activeSession = sessions.find((s) => s.endTime === null);

    return NextResponse.json({
      success: true,
      sessions,
      stats: {
        totalSessions,
        totalHours: totalHours.toFixed(2),
        totalCost: totalCost.toFixed(2),
        activeSession: activeSession || null,
      },
    });
  } catch (error: any) {
    console.error("[WORK_SESSION_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch work sessions" },
      { status: 500 }
    );
  }
}