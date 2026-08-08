import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import React from "react";
import { authOptions } from "@/lib/authOptions"; // Adjust path to match your auth config

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // 1. Unauthenticated users -> Redirect to Login
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Non-CLIENT users (e.g., ADMIN, OPERATOR) -> Redirect to Agency Dashboard
  if (session.user.role !== "CLIENT") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Isolated Portal Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            CP
          </div>
          <span className="font-semibold text-slate-800">Client Portal</span>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}