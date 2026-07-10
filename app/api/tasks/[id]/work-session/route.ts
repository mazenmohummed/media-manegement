// api/tasks/[id]/work-session/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session  = await getServerSession(authOptions);
    const userId   = session?.user?.id;
    const agencyId = session?.user?.agencyId;
    const { id: taskId } = await params;

    if (!userId || !agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action, lat, lng } = await req.json();

    if (!action || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Missing action or coordinates" },
        { status: 400 }
      );
    }

    const now           = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ── START ─────────────────────────────────────────────────────────────────
    if (action === "START") {
      // Guard: task must exist and belong to agency
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, agencyId: true },
      });
      if (!task || task.agencyId !== agencyId) {
        return NextResponse.json({ error: "Task not found." }, { status: 404 });
      }

      // Guard: no double-start — return existing open session if present
      const existing = await prisma.taskSession.findFirst({
        where: { taskId, userId, endTime: null },
      });
      if (existing) {
        return NextResponse.json(existing);
      }

      // Check if user has an open OFFICE attendance log today
      const officeLog = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          agencyId,
          date:         todayMidnight,
          type:         "OFFICE",
          checkOutTime: null,
        },
        select: { id: true },
      });

      const sessionType = officeLog ? "STANDARD" : "AFTER_HOURS";

      const newSession = await prisma.taskSession.create({
        data: {
          startTime:   now,
          sessionType,
          task:        { connect: { id: taskId } },
          user:        { connect: { id: userId } },
          ...(officeLog
            ? { attendanceLog: { connect: { id: officeLog.id } } }
            : {}),
        },
      });

      return NextResponse.json(newSession);
    }

    // ── STOP ──────────────────────────────────────────────────────────────────
    if (action === "STOP") {
      // Find the open session for this user + task
      let openSession = await prisma.taskSession.findFirst({
        where: { taskId, userId, endTime: null },
      });

      // MongoDB fallback: Prisma null-check sometimes misses missing fields
      if (!openSession) {
        const rawResults = await (prisma.taskSession as any).findRaw({
          filter: {
            taskId,
            userId,
            endTime: { $exists: false },
          },
          options: { sort: { startTime: -1 }, limit: 1 },
        });

        const rawArray = rawResults as unknown as any[];
        if (rawArray.length > 0) {
          const rawId = rawArray[0]._id?.$oid ?? rawArray[0]._id;
          openSession = await prisma.taskSession.findUnique({
            where: { id: rawId },
          });
        }
      }

      if (!openSession) {
        return NextResponse.json(
          { error: "No active task session found.", debug: { userId, taskId } },
          { status: 404 }
        );
      }

      const endTime       = now;
      const totalDuration = Math.max(
        0,
        (endTime.getTime() - openSession.startTime.getTime()) / (1000 * 60 * 60)
      );

      // Close session + increment task actualHours atomically
      const [updatedSession] = await prisma.$transaction([
        prisma.taskSession.update({
          where: { id: openSession.id },
          data:  { endTime, totalDuration },
        }),
        prisma.task.update({
          where: { id: taskId },
          data:  { actualHours: { increment: totalDuration } },
        }),
      ]);

      return NextResponse.json(updatedSession);
    }

    return new NextResponse("Invalid action", { status: 400 });
  } catch (err) {
    console.error("[WORK_SESSION_ERROR]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}