"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react"; // 1. Import Auth hooks
import { ModeToggle } from "../ModeToggle";
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  UserCircle, 
  DollarSign, 
  Wrench, 
  LogOut,
  ChevronLeft,
  Menu,
  Calendar,
  LayoutDashboard
} from "lucide-react";

export default function Sidebar() {
  const { data: session } = useSession(); // 2. Get session data
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Clients", href: "/dashboard/clients", icon: <Users size={20} /> },
    { name: "Projects", href: "/dashboard/projects", icon: <Briefcase size={20} /> },
    { name: "Tasks", href: "/dashboard/tasks", icon: <CheckSquare size={20} /> },
    { name: "Calendar", href: "/dashboard/calender", icon: <Calendar size={20} /> },
    { name: "Employees", href: "/dashboard/employees", icon: <UserCircle size={20} /> },
    { name: "Finance", href: "/dashboard/finance", icon: <DollarSign size={20} /> },
    { name: "Equipment", href: "/dashboard/equipment", icon: <Wrench size={20} /> },
  ];

  return (
    <nav 
      className={`relative flex flex-col h-screen bg-background border-r border-border transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-primary text-primary-foreground rounded-full p-1 border border-border hover:scale-110 transition-transform z-50"
      >
        {isCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* BRAND HEADER */}
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0 overflow-hidden">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.3)] shrink-0" />
          {!isCollapsed && <span className="font-black tracking-tighter text-lg italic text-blue-600">AGENCY.OS</span>}
        </Link>
      </div>

      {/* NAVIGATION LINKS */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {!isCollapsed && (
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-4">
            Main Menu
          </p>
        )}
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all group ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <span className="shrink-0 group-hover:text-blue-600 transition-colors">
              {link.icon}
            </span>
            {!isCollapsed && <span className="whitespace-nowrap capitalize">{link.name}</span>}
          </Link>
        ))}
      </div>

      {/* BOTTOM SECTION */}
      <div className="p-4 border-t border-border space-y-2">
        {/* User Info Display */}
        {session?.user && !isCollapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operator</p>
            <p className="text-sm font-bold truncate">{session.user.name}</p>
          </div>
        )}

        <div className={`flex items-center justify-between ${isCollapsed ? "flex-col gap-4" : "px-3"}`}>
          {!isCollapsed && <span className="text-[10px] font-bold text-muted-foreground uppercase">Theme</span>}
          <ModeToggle />
        </div>

        {/* Logout Button Logic */}
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })} // 3. Make logout work
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </nav>
  );
}