// components/layout/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import nextDynamic from "next/dynamic";
import { useAttendance } from "@/components/main/attendance/AttendanceContext";
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  UserCircle, 
  DollarSign, 
  Wrench, 
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  Calendar,
  LayoutDashboard,
  Clock,
  Bell,
  LucideDatabase,
  Target,
  FileText,
  FileCheck,
  LayoutTemplate,
  Layers,
  Building2,
  Flag,
  Receipt,
  CreditCard,
  PieChart,
  Repeat,
  FileSpreadsheet,
  Send,
  CalendarDays,
  ClipboardList,
  ShoppingCart,
  Link2,
} from "lucide-react";
import { NotificationDrawer } from "../main/EmployeeDashboard";
import { ProcurementChainWidget } from "@/components/procurement/ProcurementChainWidget";

// Define the interface for navigation items
interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  isDropdownGroup?: boolean;
  mainLink?: { name: string; href: string; icon: React.ReactNode };
  items: NavItem[];
}

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
  const [procurementTaskIds, setProcurementTaskIds] = useState<string[]>([]);

  // Shared attendance state
  const { attendance, loading, error, performAction } = useAttendance();
  const isCheckedIn = !!attendance && !attendance.checkOutTime;

  // ─── Navigation Sections ──────────────────────────────────────────────────────

  const navSections: NavSection[] = [
    {
      title: "Overview",
      isDropdownGroup: true,
      mainLink: { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      items: [    
        { name: "Calendar", href: "/dashboard/calender", icon: <Calendar size={18} /> },
        { name: "Storage", href: "/dashboard/storage", icon: <LucideDatabase size={18} /> },
      ],
    },
    {
      title: "Sales & CRM",
      isDropdownGroup: true,
      mainLink: { name: "Sales & CRM", href: "/dashboard/sales-crm", icon: <Target size={18} /> },
      items: [
        { name: "Leads", href: "/dashboard/leads", icon: <LucideDatabase size={18} /> },
        { name: "Opportunities", href: "/dashboard/opportunities", icon: <Target size={18} /> },
        { name: "Proposals", href: "/dashboard/proposals", icon: <FileText size={18} /> },
        { 
          name: "Contracts",
          href: "/dashboard/contracts",
          icon: <FileCheck size={18} />,
          children: [
            { name: "Recurring Schedules", href: "/dashboard/contracts/recurring-schedules", icon: <Repeat size={18} /> }
          ]
        },
      ],
    },
    {
      title: "Projects & Tasks",
      isDropdownGroup: true,
      mainLink: { name: "Projects & Tasks", href: "/dashboard/projects-tasks", icon: <Target size={18} /> },
      items: [
        { name: "Projects", href: "/dashboard/projects", icon: <Briefcase size={18} /> },
        { name: "Milestones", href: "/dashboard/milestones", icon: <Flag size={18} /> },
        { name: "Tasks", href: "/dashboard/tasks", icon: <CheckSquare size={18} /> },
        { name: "Task Categories", href: "/dashboard/task-categories", icon: <Layers size={18} /> },
        { name: "Templates", href: "/dashboard/templates", icon: <LayoutTemplate size={18} /> },
      ],
    },
    {
      title: "Finance & Billing",
      isDropdownGroup: true,
      mainLink: { name: "Finance Hub", href: "/dashboard/finance", icon: <DollarSign size={18} /> },
      items: [
        { name: "Clients", href: "/dashboard/finance/clients", icon: <Users size={18} /> },
        { name: "Employees", href: "/dashboard/finance/employees", icon: <UserCircle size={18} /> },
        { name: "Equipment", href: "/dashboard/finance/equipment", icon: <Wrench size={18} /> },
        { name: "Expenses", href: "/dashboard/finance/expenses", icon: <PieChart size={18} /> },
        { name: "Invoices", href: "/dashboard/finance/invoices", icon: <Receipt size={18} /> },
        { name: "Payments", href: "/dashboard/finance/payments", icon: <CreditCard size={18} /> },
      ],
    },
    {
      title: "Organization & HR",
      isDropdownGroup: true,
      mainLink: { name: "Organization & HR", href: "/dashboard/organization-hr", icon: <Target size={18} /> },
      items: [
        { name: "Clients Directory", href: "/dashboard/clients", icon: <Users size={18} /> },
        { name: "Employees Directory", href: "/dashboard/employees", icon: <UserCircle size={18} />, children: [
            { name: "Invitations", href: "/dashboard/employees/invitations", icon: <Send size={18} /> },
            { name: "Leave Requests", href: "/dashboard/employees/leaves", icon: <CalendarDays size={18} /> },
          ] 
        },
        { name: "Departments", href: "/dashboard/departments", icon: <Building2 size={18} /> },
        { name: "Equipment Directory", href: "/dashboard/assets", icon: <Wrench size={18} /> },
        { 
          name: "Procurement Dashboard", href: "/dashboard/procurement", icon: <ClipboardList size={18} /> ,
          children: [
              { name: "Procurement Chains", href: "/dashboard/procurement/chains", icon: <Link2 size={18} /> },
            { name: "Vendors", href: "/dashboard/vendors", icon: <Building2 size={18} />},
            { name: "Quotations", href: "/dashboard/procurement/quotations", icon: <FileSpreadsheet size={18} /> },
            { name: "Planned Orders", href: "/dashboard/procurement/planned-purchase-orders", icon: <Receipt size={18} /> },
            { name: "Purchase Orders", href: "/dashboard/vendors/purchase-orders", icon: <Receipt size={18} /> },
          ]
        },
      ],
    },
  ];

  // Track open/closed state for dropdown sections
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    navSections.forEach((section) => {
      const hasActive = section.isDropdownGroup 
        ? (section.mainLink?.href === pathname || section.items.some((link) => pathname.startsWith(link.href)))
        : section.items.some((link) => link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href) || (link.children && link.children.some(c => pathname.startsWith(c.href))));
      initial[section.title] = hasActive;
    });
    return initial;
  });

  // Track independent open states for specific nested parent items
  const [openSubMenus, setOpenSubMenus] = useState<{ [key: string]: boolean }>({
    "Vendors": pathname.startsWith("/dashboard/vendors") || pathname.startsWith("/dashboard/procurement"),
    "Contracts": pathname.startsWith("/dashboard/contracts"),
    "Employees Directory": pathname.startsWith("/dashboard/employees")
  });

  const toggleSection = (title: string) => {
    if (isCollapsed) return;
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleSubMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCollapsed) return;
    setOpenSubMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // ─── Fetch Notifications ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch Procurement Tasks ──────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProcurementTasks() {
      try {
        const res = await fetch('/api/tasks/procurement');
        if (res.ok) {
          const data = await res.json();
          setProcurementTaskIds(data.map((t: any) => t.id));
        }
      } catch (error) {
        console.error("Error fetching procurement tasks:", error);
      }
    }
    fetchProcurementTasks();
  }, []);

  // ─── Handle Logout ───────────────────────────────────────────────────────────

  const handlePurgeSession = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Error revoking session tokens on server:", err);
    } finally {
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
      <div className="px-4 pt-4">
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
      </div>

      {/* NOTIFICATION DRAWER */}
      {notifOpen && (
        <NotificationDrawer
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {/* ATTENDANCE WIDGET */}
      <div className={`p-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
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
      {/* NAVIGATION SECTIONS */}
      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-3 no-scrollbar">
        {navSections.map((section, idx) => {
          const isSectionOpen = openSections[section.title] || false;
          
          const hasActiveChild = section.isDropdownGroup 
            ? (pathname === section.mainLink?.href || section.items.some((link) => pathname.startsWith(link.href) || (link.children && link.children.some(c => pathname.startsWith(c.href)))))
            : section.items.some((link) => link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href) || (link.children && link.children.some(c => pathname.startsWith(c.href))));

          return (
            <div key={idx} className="space-y-1">
              {section.isDropdownGroup ? (
                <div className="space-y-1">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    hasActiveChild ? "text-blue-500 bg-blue-500/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                    <Link
                      href={section.mainLink!.href}
                      className="flex items-center gap-3 flex-1 overflow-hidden"
                    >
                      <span className="shrink-0">{section.mainLink!.icon}</span>
                      {!isCollapsed && (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate">
                          {section.title}
                        </span>
                      )}
                    </Link>

                    {!isCollapsed && (
                      <button 
                        onClick={() => toggleSection(section.title)}
                        className="p-1 hover:text-foreground transition-colors"
                      >
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-300 ${isSectionOpen ? "rotate-180" : ""}`} 
                        />
                      </button>
                    )}
                  </div>

                  {(isSectionOpen || isCollapsed) && (
                    <div className={`space-y-1 ${!isCollapsed ? "pl-2 pt-1 border-l border-border/40 ml-3" : ""}`}>
                      {section.items.map((link) => {
                        const isActive = link.href === "/dashboard/sales-crm" 
                          ? pathname === "/dashboard/sales-crm" 
                          : pathname.startsWith(link.href);

                        const hasChildren = link.children && link.children.length > 0;
                        const isSubMenuOpen = openSubMenus[link.name] || pathname.startsWith(link.href);

                        return (
                          <div key={link.name} className="space-y-1">
                            <div className={`relative flex items-center justify-between px-3 py-2 text-sm font-bold transition-all duration-300 rounded-xl group ${
                              isActive && !hasChildren
                                ? "text-blue-600 bg-blue-600/10 shadow-[0_0_25px_rgba(37,99,235,0.15)] border border-blue-600/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            } ${isCollapsed ? "justify-center" : ""}`}>
                              
                              <Link
                                href={link.href}
                                className={`flex items-center gap-3 flex-1 overflow-hidden ${isCollapsed ? "justify-center" : ""}`}
                              >
                                <span className={`shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                                  {link.icon}
                                </span>
                                {!isCollapsed && (
                                  <span className="whitespace-nowrap uppercase tracking-widest text-[11px]">
                                    {link.name}
                                  </span>
                                )}
                              </Link>

                              {hasChildren && !isCollapsed && (
                                <button
                                  onClick={(e) => toggleSubMenu(link.name, e)}
                                  className="p-1 hover:text-foreground transition-colors"
                                >
                                  <ChevronDown 
                                    size={14} 
                                    className={`transition-transform duration-300 ${isSubMenuOpen ? "rotate-180" : ""}`} 
                                  />
                                </button>
                              )}
                            </div>

                            {/* Render Nested Children */}
                            {hasChildren && isSubMenuOpen && !isCollapsed && (
                              <div className="pl-4 pt-1 space-y-1 border-l border-border/30 ml-3">
                                {link.children?.map((child: NavItem) => {
                                  const isChildActive = pathname.startsWith(child.href);
                                  return (
                                    <Link
                                      key={child.name}
                                      href={child.href}
                                      className={`relative flex items-center gap-3 px-3 py-1.5 text-xs font-bold transition-all duration-300 rounded-xl group ${
                                        isChildActive 
                                          ? "text-blue-600 bg-blue-600/10 border border-blue-600/20" 
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                      }`}
                                    >
                                      <span className="shrink-0">{child.icon}</span>
                                      <span className="whitespace-nowrap uppercase tracking-widest text-[10px]">
                                        {child.name}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* BOTTOM SECTION */}
      <div className="p-4 border-t border-border space-y-3 bg-muted/20">
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