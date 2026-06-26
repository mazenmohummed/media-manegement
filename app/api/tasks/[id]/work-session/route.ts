import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const agencyId = session?.user?.agencyId;
    const { id: taskIdFromRoute } = await params;

    if (!userId || !agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action, lat, lng } = await req.json();

    if (!action || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Missing coordinates or action" },
        { status: 400 }
      );
    }

    // --- START LOGIC ---
    if (action === "START") {
      const activeSession = await prisma.attendanceLog.findFirst({
        where: { userId, taskId: taskIdFromRoute, checkOutTime: null },
        include: { task: true } // Include task metadata for immediate frontend consumption
      });

      if (activeSession) return NextResponse.json(activeSession);

      // Fetch task details to attach task name context strings dynamically if necessary
      const structuralTask = await prisma.task.findUnique({
        where: { id: taskIdFromRoute },
        select: { id: true }
      });

      // 2. Safeguard: Block execution if the task ID is invalid
      if (!structuralTask) {
        return NextResponse.json(
          { error: "Target production task node not found." },
          { status: 444 }
        );
      }

      // 3. Proceed with creating the log safely...
      const newLog = await prisma.attendanceLog.create({
        data: {
          userId,
          taskId: taskIdFromRoute,
          agencyId,
          checkInTime: new Date(),
          status: "ACTIVE",
          type: "FIELD_TASK",
          checkInLocation: "FIELD_TASK",
          checkInLat: lat,
          checkInLng: lng,
        },
        include: { task: true }
      });

      return NextResponse.json(newLog);
    }

    // --- STOP LOGIC ---
    if (action === "STOP") {
      let logToClose = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          taskId: taskIdFromRoute,
          checkOutTime: null,
        },
      });

      // Fallback 1: MongoDB $exists check via findRaw
      if (!logToClose) {
        console.log("Prisma null check failed. Trying $exists fallback...");
        const rawResults = await prisma.attendanceLog.findRaw({
          filter: {
            userId: userId,
            taskId: taskIdFromRoute,
            checkOutTime: { $exists: false },
          },
        });

        const rawArray = rawResults as unknown as any[];
        if (rawArray.length > 0) {
          const raw = rawArray[0];
          const rawId = raw._id?.$oid ?? raw._id;
          logToClose = await prisma.attendanceLog.findUnique({
            where: { id: rawId },
          });
        }
      }

      // Fallback 2: Broad application query strategy
      if (!logToClose) {
        console.log("Attempting broad $exists fallback for any open session...");
        const rawResults = await prisma.attendanceLog.findRaw({
          filter: {
            userId: userId,
            checkOutTime: { $exists: false },
          },
          options: { sort: { checkInTime: -1 }, limit: 1 },
        });

        const rawArray = rawResults as unknown as any[];
        if (rawArray.length > 0) {
          const raw = rawArray[0];
          const rawId = raw._id?.$oid ?? raw._id;
          logToClose = await prisma.attendanceLog.findUnique({
            where: { id: rawId },
          });
        }
      }

      if (!logToClose) {
        return NextResponse.json(
          { error: "No active session found.", debug: { userId, taskIdFromRoute } },
          { status: 404 }
        );
      }

      // --- Close the session and calculate differentials ---
      const checkOutTime = new Date();
      const diffMs = checkOutTime.getTime() - logToClose.checkInTime.getTime();
      const sessionHours = Math.max(0, diffMs / (1000 * 60 * 60));

      // Execute transactional status update adjustments
      const [updatedLog] = await prisma.$transaction([
        prisma.attendanceLog.update({
          where: { id: logToClose.id },
          data: {
            checkOutTime,
            checkOutLat: lat,
            checkOutLng: lng,
            totalHours: sessionHours,
            status: "COMPLETED",
          },
          include: { task: true }
        }),
        prisma.task.update({
          where: { id: logToClose.taskId || taskIdFromRoute }, // Fallback protection
          data: { actualHours: { increment: sessionHours } },
        }),
      ]);

      return NextResponse.json(updatedLog);
    }

    return new NextResponse("Invalid Action", { status: 400 });
  } catch (error) {
    console.error("SESSION_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}