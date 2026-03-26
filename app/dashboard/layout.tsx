// app/dashboard/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Sidebar from "@/components/main/Sidebar";


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  // If user exists but hasn't finished onboarding (no agency linked)
  if (!session.user.agencyId || session.user.agencyId === "PENDING_ONBOARDING") {
    redirect("/onboarding");
  }

  return <>    
  <div className="min-h-screen bg-background flex overflow-hidden">
      {/* FIXED SIDEBAR */}
      <Sidebar/>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 h-screen overflow-y-auto bg-background relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent " />
       
        
        <div className="max-w-[1600px] mx-auto p-4">

          {children}
        </div>
      </main>
    </div>
    </>;
}