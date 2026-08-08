import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions"; // Adjust path if using @/lib/auth
import prisma from "@/lib/prisma";
import Sidebar from "@/components/main/Sidebar";
import { AttendanceProvider } from "@/components/main/attendance/Attendancecontext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  /**
   * SAFETY & ACCESS GUARDS (Server-Side)
   */
  // 1. Unauthenticated users -> Redirect to Login
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Client role -> Hard-redirect to Client Portal (Blocks access to Agency Dashboard)
  if (session.user.role === "CLIENT") {
    redirect("/portal");
  }

  // 3. Operator/Admin without an Agency -> Redirect to Onboarding
  if (!session.user.agencyId) {
    redirect("/onboarding");
  }

  // Fetch active attendance log for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAttendance = await prisma.attendanceLog.findFirst({
    where: {
      userId: session.user.id,
      agencyId: session.user.agencyId,
      type: "OFFICE",
      date: today,
      checkOutTime: null,
    },
    orderBy: {
      checkInTime: "desc",
    },
  });

  return (
    <AttendanceProvider initialAttendance={activeAttendance}>
      <div className="flex h-screen bg-background overflow-hidden font-sans">
        {/* SIDEBAR — reads attendance state from context */}
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