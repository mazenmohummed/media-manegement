import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import Sidebar from "@/components/main/Sidebar";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* SIDEBAR 
        We can pass the agencyName to the Sidebar if needed, 
        or let the Sidebar fetch it via useSession() on the client.
      */}
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
  );
}