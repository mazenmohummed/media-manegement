"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import nextDynamic from "next/dynamic";
import { useAttendance } from "@/components/main/attendance/Attendancecontext";
import { 
  Users, 
  Briefcase, 
  Workflow,
  CheckSquare, 
  UserCircle, 
  DollarSign, 
  Wrench, 
  LogOut,
  ChevronLeft,
  Menu,
  Calendar,
  LayoutDashboard,
  Clock,
  Bell,
  LucideDatabase,
} from "lucide-react";
import { NotificationDrawer } from "./EmployeeDashboard";

// Safe dynamic import to permanently silence Radix UI hydration mismatches
const ModeToggle = nextDynamic(() => import("../ModeToggle").then((mod) => mod.ModeToggle), {
  ssr: false,
  loading: () => <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
});

export default function Sidebar() {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Shared attendance state
  const { attendance, loading, error, performAction } = useAttendance();

  const isCheckedIn = !!attendance && !attendance.checkOutTime;

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Leads", href: "/dashboard/leads", icon: <LucideDatabase size={20} /> },
    { name: "opportunities", href: "/dashboard/opportunities", icon: <LucideDatabase size={20} /> },
    { name: "proposals", href: "/dashboard/proposals", icon: <LucideDatabase size={20} /> },
    { name: "Clients", href: "/dashboard/clients", icon: <Users size={20} /> },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: <Workflow size={20} /> },
    { name: "Projects", href: "/dashboard/projects", icon: <Briefcase size={20} /> },
    { name: "Tasks", href: "/dashboard/tasks", icon: <CheckSquare size={20} /> },
    { name: "Calendar", href: "/dashboard/calender", icon: <Calendar size={20} /> },
    { name: "Employees", href: "/dashboard/employees", icon: <UserCircle size={20} /> },
    { name: "Finance", href: "/dashboard/finance", icon: <DollarSign size={20} /> },
    { name: "Equipment", href: "/dashboard/equipment", icon: <Wrench size={20} /> },
  ];

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Unified Logout Handler
   * Revokes refresh token in database, clears HTTP-Only cookies,
   * and terminates the NextAuth session.
   */
  const handlePurgeSession = async () => {
    try {
      setIsLoggingOut(true);

      // 1. Call backend logout endpoint to revoke refresh token & clear HTTP-Only cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Error revoking session tokens on server:", err);
    } finally {
      // 2. Clear NextAuth session and redirect user to login
      await signOut({ callbackUrl: "/login" });
    }
  };

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
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] shrink-0 animate-pulse" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-black tracking-tighter text-sm italic text-blue-600 uppercase truncate max-w-[120px]">
                {session?.user?.agencyName || "Loading..."}
              </span>
              <span className="text-[8px] font-bold text-muted-foreground tracking-[0.2em] -mt-1 uppercase">
                Agency OS
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* NOTIFICATIONS TRIGGER */}
      <button
        onClick={() => setNotifOpen(true)}
        className={`relative flex items-center gap-3 w-full px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground hover:bg-muted border border-transparent hover:border-border/50 rounded-xl transition-all ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <Bell size={18} className="shrink-0" />
        {!isCollapsed && <span>Notifications</span>}
        {unreadCount > 0 && (
          <span className="absolute top-2 left-7 w-4 h-4 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION DRAWER */}
      {notifOpen && (
        <NotificationDrawer
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {/* ATTENDANCE WIDGET */}
      <div className={`mt-auto p-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-6'}`}>
        <div className={`rounded-2xl border transition-all ${isCheckedIn ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-muted/50 border-border'}`}>
          <button
            onClick={() => performAction(isCheckedIn ? "CHECK_OUT" : "CHECK_IN")}
            disabled={loading}
            className={`w-full flex items-center disabled:opacity-50 ${isCollapsed ? 'justify-center p-3' : 'gap-3 p-3'}`}
            title={isCheckedIn ? "End Workday" : "Start Workday"}
          >
            <div className={`p-2 rounded-xl ${isCheckedIn ? 'bg-emerald-500 text-white' : 'bg-background border border-border'}`}>
              <Clock size={16} />
            </div>
            {!isCollapsed && (
              <div className="text-left overflow-hidden">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Attendance</p>
                <p className="text-[11px] font-bold truncate">
                  {loading ? "Updating..." : isCheckedIn ? "Shift Active" : "Clock In"}
                </p>
              </div>
            )}
          </button>
        </div>
        {error && !isCollapsed && (
          <p className="text-[9px] font-bold text-rose-500 mt-2 px-1">{error}</p>
        )}
      </div>

      {/* NAVIGATION LINKS */}
      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-2 no-scrollbar">
        {!isCollapsed && (
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-3 mb-6 opacity-50">
            Main Systems
          </p>
        )}
        
        {navLinks.map((link) => {
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
            onClick={handlePurgeSession}
            disabled={isLoggingOut}
            className={`flex items-center gap-3 w-full px-3 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all disabled:opacity-50 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={18} className={`shrink-0 ${isLoggingOut ? "animate-spin" : ""}`} />
            {!isCollapsed && (
              <span>{isLoggingOut ? "Purging..." : "Purge Session"}</span>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}