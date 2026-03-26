"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // 1. Added usePathname
import { useSession, signOut } from "next-auth/react";
import { ModeToggle } from "../ModeToggle";
import { motion } from "framer-motion"; // 2. Optional: for smoother glow transitions
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
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname(); // 3. Get current path

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
      className={`relative flex flex-col h-screen bg-background border-r border-border transition-all duration-500 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-primary text-primary-foreground rounded-full p-1 border border-border hover:scale-110 transition-transform z-50 shadow-lg"
      >
        {isCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* BRAND HEADER */}
      <div className="h-20 flex items-center px-6 border-b border-border shrink-0 overflow-hidden">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] shrink-0 animate-pulse" />
          {!isCollapsed && <span className="font-black tracking-tighter text-lg italic text-blue-600">AGENCY.OS</span>}
        </Link>
      </div>

      {/* NAVIGATION LINKS */}
      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 no-scrollbar">
        {!isCollapsed && (
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-3 mb-6 opacity-50">
            Main Systems
          </p>
        )}
        
        {navLinks.map((link) => {
          // 4. Logic to check if active
          // Check if it's the root dashboard link for an exact match
          // Otherwise, use startsWith to keep sub-routes (like /finance/clients) active
          const isActive = link.href === "/dashboard" 
            ? pathname === "/dashboard" 
            : pathname.startsWith(link.href);
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`relative flex items-center gap-3 px-3 py-3 text-sm font-bold transition-all duration-300 rounded-xl group ${
                isActive 
                  ? "text-blue-600 bg-blue-600/10 shadow-[0_0_25px_rgba(37,99,235,0.15)] border border-blue-600/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,1)]"
                />
              )}

              <span className={`shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                {link.icon}
              </span>

              {!isCollapsed && (
                <span className="whitespace-nowrap uppercase tracking-widest text-[11px]">
                  {link.name}
                </span>
              )}

              {/* Decorative Glow Dot for Active */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1 h-1 bg-blue-600 rounded-full animate-ping" />
              )}
            </Link>
          );
        })}
      </div>

      {/* BOTTOM SECTION */}
      <div className="p-6 border-t border-border space-y-4 bg-muted/20">
        {session?.user && !isCollapsed && (
          <div className="px-3">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">System Operator</p>
            <p className="text-sm font-black italic truncate text-foreground">{session.user.name}</p>
          </div>
        )}

        <div className={`flex items-center justify-between bg-background border border-border p-2 rounded-2xl ${isCollapsed ? "flex-col gap-4" : "px-3"}`}>
          {!isCollapsed && <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Theme</span>}
          <ModeToggle />
        </div>

        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`flex items-center gap-3 w-full px-3 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Purge Session</span>}
          </button>
        )}
      </div>
    </nav>
  );
}