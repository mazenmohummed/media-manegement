import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  console.log("DEBUG SESSION:", session); // Check your VS Code Terminal

  if (!session) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  if (!(session.user as any)?.id) {
    return NextResponse.json({ error: "Session exists but ID is missing" }, { status: 401 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No user ID found in session" }, { status: 401 });
  }

  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  const userId = (session.user as any).id;
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    // Find today's log
    const existingLog = await prisma.attendanceLog.findFirst({
      where: {
        userId: userId,
        date: { gte: startOfDay },
      },
    });

    if (!existingLog) {
      // PUNCH IN
      const checkInTime = new Date();
      const officeStart = new Date();
      officeStart.setHours(9, 0, 0); // 9:00 AM threshold

      const log = await prisma.attendanceLog.create({
        data: {
          userId,
          date: new Date(),
          checkInTime: checkInTime,
          checkOutTime: checkInTime, // Initial checkout is same as checkin
          status: checkInTime > officeStart ? "LATE" : "PRESENT",
        },
      });
      return NextResponse.json({ message: "Punched In", log });
    } else {
      // PUNCH OUT
      const log = await prisma.attendanceLog.update({
        where: { id: existingLog.id },
        data: { checkOutTime: new Date() },
      });
      return NextResponse.json({ message: "Punched Out", log });
    }
  } catch (err) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}