// app/dashboard/layout.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/main/Sidebar";
import {
  AttendanceProvider,
  type AttendanceLog as ContextAttendanceLog,
} from "@/components/main/attendance/AttendanceContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/portal");
  if (!session.user.agencyId) redirect("/onboarding");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const activeAttendance = await prisma.attendanceLog.findFirst({
    where: {
      userId: session.user.id,
      agencyId: session.user.agencyId,
      type: "OFFICE",
      date: { gte: startOfDay, lt: endOfDay },
      checkOutTime: null,
    },
    orderBy: { checkInTime: "desc" },
  });

  // ✅ Normalize Prisma result → context's AttendanceLog shape
  const normalizedAttendance: ContextAttendanceLog | null = activeAttendance
    ? {
        id: activeAttendance.id,
        date: activeAttendance.date.toISOString(),
        checkInTime: activeAttendance.checkInTime.toISOString(),
        checkOutTime: activeAttendance.checkOutTime
          ? activeAttendance.checkOutTime.toISOString()
          : null,
        isLate: activeAttendance.isLate,
        isEarlyOut: activeAttendance.isEarlyOut,
        totalHours: activeAttendance.totalHours,
        status: String(activeAttendance.status),
        type: String(activeAttendance.type),
      }
    : null;

  return (
    <AttendanceProvider initialAttendance={normalizedAttendance}>
      <div className="flex h-screen bg-background overflow-hidden font-sans">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background relative custom-scrollbar">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            <div className="max-w-[1600px] mx-auto p-6 lg:p-10 animate-in fade-in duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AttendanceProvider>
  );
}