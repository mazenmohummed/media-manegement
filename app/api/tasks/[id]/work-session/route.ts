import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db"; // Updated to match your common export name
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
      });

      if (activeSession) return NextResponse.json(activeSession);

      const newLog = await prisma.attendanceLog.create({
        data: {
          userId,
          taskId: taskIdFromRoute,
          agencyId,
          checkInTime: new Date(),
          checkOutTime: null,
          checkInLat: lat,
          checkInLng: lng,
          status: "ACTIVE",
          type: "FIELD_TASK",
          checkInLocation: "FIELD_TASK",
        },
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

      // 2. Fallback: MongoDB $exists check (using unknown cast fix)
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

      // 3. Broad fallback: Any open session for this user
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

      // 4. Final validation
      if (!logToClose) {
        return NextResponse.json(
          { error: "No active session found.", debug: { userId, taskIdFromRoute } },
          { status: 404 }
        );
      }

      // --- Close the session ---
      const checkOutTime = new Date();
      const diffMs = checkOutTime.getTime() - logToClose.checkInTime.getTime();
      const sessionHours = Math.max(0, diffMs / (1000 * 60 * 60));

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
        }),
        prisma.task.update({
          where: { id: taskIdFromRoute },
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