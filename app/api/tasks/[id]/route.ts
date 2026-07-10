// api/tasks/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createNotification } from "@/lib/notifications";

// ─── GET /api/tasks/[id] ──────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session  = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: { select: { clientName: true } } },
        },
        assignees: {
          select: {
            id: true, name: true, role: true, userType: true,
            baseSalary: true, walletBalance: true, efficiencyRate: true,
            verifiedSkills: true,
          },
        },
        assets:      true,
        taskExpenses: true,
        comments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        todos: { orderBy: { order: "asc" } },

        // ── NEW: task sessions (replaces attendanceLogs for working state) ──
        taskSessions: {
          orderBy: { startTime: "desc" },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },

        // Keep attendanceLogs for historical/office context
        attendanceLogs: {
          orderBy: { checkInTime: "desc" },
          include: {
            user: { select: { id: true, name: true } },
          },
        },

        financialTransactions: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
          },
        },

        agency: {
          select: {
            latitude: true, longitude: true, radius: true,
            agencyName: true, address: true,
          },
        },
      },
    });

    if (!task || task.agencyId !== agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("[TASK_GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/tasks/[id] ────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // 1. Fetch current state
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { assignees: true, project: true }
    });

    if (!existingTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // 2. Destructure and whitelist
    // 👇 Added comments + attendanceLogs — these are relations on Task and
    // must be stripped out just like the other relation fields below.
    // Leaving them in `updates` sends a raw array (e.g. comments: []) to
    // Prisma's update(), which only accepts nested-write objects
    // ({ set / connect / create }) for relations, never a plain array.
    const { 
  id: _id, createdAt: _ca, updatedAt: _ua, lastUpdateTimestamp: _lut,
  completedAt: _cat, // ← strip this unknown field
  project: _p, assignees: _a, assets: _as, todos: _t, taskSessions: _ts, 
  taskExpenses: _te, financialTransactions: _ft, agency: _ag,
  comments: _co, attendanceLogs: _al,
  projectId, agencyId: _agencyId, assetIds,
  assigneeIds, startDate, endDate, 
  ...updates 
} = body;

const updated = await prisma.task.update({
  where: { id },
  data: {
    ...updates,
    lastUpdateTimestamp: new Date(),
    // Only connect project if projectId was actually sent
    ...(projectId && { project: { connect: { id: projectId } } }),
    ...(startDate  && { startDate:  new Date(startDate)  }),
    ...(endDate    && { endDate:    new Date(endDate)    }),
    ...(assigneeIds && {
      assignees: { set: assigneeIds.map((aid: string) => ({ id: aid })) },
    }),
    ...(assetIds && {
      assets: { set: assetIds.map((aid: string) => ({ id: aid })) },
    }),
  },
});
   


// 4. Trigger Notifications
const newStatus = body.status?.toUpperCase();
const oldStatus = existingTask.status?.toUpperCase();

const notificationPayload = (() => {
  if (newStatus === "COMPLETED" && oldStatus !== "COMPLETED") {
    return {
      title: "Task Completed",
      message: `Task "${existingTask.taskType}" for project ${existingTask.project?.projectName || "Unknown"} has been marked as completed by ${session.user.name}.`,
    };
  }
  if (newStatus === "ACTIVE" && oldStatus !== "ACTIVE") {
    return {
      title: "Task Started",
      message: `Task "${existingTask.taskType}" for project ${existingTask.project?.projectName || "Unknown"} is now active.`,
    };
  }
  if (newStatus === "CANCELLED" && oldStatus !== "CANCELLED") {
    return {
      title: "Task Cancelled",
      message: `Task "${existingTask.taskType}" for project ${existingTask.project?.projectName || "Unknown"} has been cancelled.`,
    };
  }
  // General update — always notify
  return {
    title: "Task Updated",
    message: `Task "${existingTask.taskType}" for project ${existingTask.project?.projectName || "Unknown"} was updated by ${session.user.name}.`,
  };
})();

try {
  await Promise.all(
    existingTask.assignees.map((user) =>
      createNotification({
        title:    notificationPayload.title,
        message:  notificationPayload.message,
        type:     "SYSTEM",
        userId:   user.id,
        agencyId,
      })
    )
  );
} catch (notifErr) {
  console.error("[NOTIFICATION_ERROR]", notifErr);
}

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[TASK_PATCH_ERROR]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}