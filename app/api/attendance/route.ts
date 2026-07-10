// api/attendance/route.ts

import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const agencyId = session?.user?.agencyId;

    if (!userId || !agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action } = await req.json();

    // workingHours is an embedded type — no `include` needed, it comes with the agency
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
    });

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Resolve the working day config for today
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" }); // e.g. "Monday"
    const todaySchedule = agency?.workingHours?.find(
      (d) => d.day === todayName && !d.isClosed
    );

    // --- CASE 1: MASTER OFFICE CHECK-IN ---
    if (action === "CHECK_IN") {
      const existing = await prisma.attendanceLog.findFirst({
        where: { userId, agencyId, date: todayMidnight, type: "OFFICE" },
      });

      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }

      const [openHour, openMinute] = (todaySchedule?.openTime ?? "09:00")
        .split(":")
        .map(Number);

      const shiftStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        openHour,
        openMinute
      );

      const isLate = now > shiftStart;

      const attendance = await prisma.attendanceLog.create({
        data: {
          date: todayMidnight,
          checkInTime: now,
          checkOutTime: null, // 👈 force the field to exist on creation
          totalHours: null,   // 👈 same treatment for the other optional field
          isLate,
          status: isLate ? "LATE" : "PRESENT",
          type: "OFFICE",
          userId,
          agencyId,
        },
      });

      return NextResponse.json(attendance);
    }

    // --- CASE 2: MASTER OFFICE CHECK-OUT ---
    if (action === "CHECK_OUT") {
      const attendance = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          agencyId,
          type: "OFFICE",
          OR: [
            { checkOutTime: null },
            { checkOutTime: { isSet: false } }, // catches legacy docs missing the key
          ],
        },
        orderBy: {
          checkInTime: "desc", // pick the most recent open session if multiple exist
        },
      });

      if (!attendance) {
        console.log("No active log found for:", { userId, agencyId });
        return NextResponse.json(
          { message: "No active check-in found for today" },
          { status: 404 }
        );
      }

      const [closeHour, closeMinute] = (todaySchedule?.closeTime ?? "17:00")
        .split(":")
        .map(Number);

      const shiftEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        closeHour,
        closeMinute
      );

      const isEarlyOut = now < shiftEnd;
      const totalHours =
        (now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60);

      const updated = await prisma.attendanceLog.update({
        where: { id: attendance.id },
        data: { checkOutTime: now, isEarlyOut, totalHours },
      });

      return NextResponse.json(updated);
    }

    return new NextResponse("Invalid action", { status: 400 });
  } catch (error) {
    console.error("ATTENDANCE_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}