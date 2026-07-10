// app/dashboard/layout.tsx


import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import Sidebar from "@/components/main/Sidebar";
import { AttendanceProvider } from "@/components/main/attendance/Attendancecontext";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const session = await getServerSession(authOptions);

  /**
   * SAFETY CHECK (Server-Side)
   * Even though middleware handles redirects, we keep a "Hard Wall" 
   * here to prevent any undefined session errors in child components.
   */
  if (!session) redirect("/login");
  if (!session.user?.agencyId) redirect("/onboarding");

  // Fetch only the active log for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAttendance = await prisma.attendanceLog.findFirst({
    where: { 
      userId: session.user.id,
      agencyId: session.user.agencyId,
      type: "OFFICE",
      date: today,
      OR: [
        { checkOutTime: null },
        { checkOutTime: { isSet: false } }, // catches legacy docs missing the key
      ],
    },
    orderBy: {
      checkInTime: "desc",
    },
  });

  return (
    <AttendanceProvider initialAttendance={activeAttendance}>
      <div className="flex h-screen bg-background overflow-hidden font-sans">
        {/* SIDEBAR — reads attendance state from context, no prop needed */}
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* MAIN VIEWPORT */}
          <main className="flex-1 overflow-y-auto bg-background relative custom-scrollbar">
            {/* Subtle Top Glow */}
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