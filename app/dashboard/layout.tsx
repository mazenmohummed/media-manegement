import React from "react";
import Sidebar from "@/components/main/Sidebar";// We'll create this next

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* FIXED SIDEBAR */}
      <Sidebar />

      {/* MAIN VIEWPORT */}
      <main className="flex-1 h-screen overflow-y-auto bg-background relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
       
        
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}