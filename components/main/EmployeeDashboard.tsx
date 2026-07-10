"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Briefcase, CheckSquare, TrendingUp,
  DollarSign, MapPin, Bell, Edit3, ShieldCheck,
  Clock, Zap, ArrowUpRight, ArrowDownRight,
  AlertCircle, CheckCircle2, X, Save, Loader2,
  CreditCard, UserCheck, Calendar, Search
} from "lucide-react";
import PerformanceTable from "./employees/PerformanceTable";
import { AttendanceControl } from "./attendance/AttendanceControl";
import AttendanceCard from "./attendance/AttendanceCard";
import { TaskSessionList } from "./attendance/TaskSessionCard";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  userType: "FULL_TIME" | "PART_TIME" | "FREELANCER" | "INTERN";
  baseSalary: number;
  walletBalance: number;
  efficiencyRate: number;
  verifiedSkills: string[];
  isCheckedInToday: boolean;
  totalRevenue: number;
  profitContribution: number;
  commissions: number;
  overtime: number;
  deductions?: number; // Added to map correctly from backend/state schemas
  totalWorkingHours: number;
  lateCount: number;
  totalPayouts: number;
  ledgerTotal: number;
  tasksCount: number;
  completedTasksCount: number;
  activeTasksCount: number;
  leaves?: Array<{ status: string }>; // Added to resolve template condition
  attendanceLogs?: Array<{ type: string }>;
}

interface WorkingDay {
  day: string; openTime: string; closeTime: string; isClosed: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean; // <--- ADD THIS LINE
  userId: string;
  createdAt: Date;
}

interface RecentPayout {
  id: string; amount: number; category: string; status: string;
  date: string; description: string | null; userName: string; userRole: string; userId: string;
}

interface RecentAttendance {
  id: string; checkInTime: string; checkOutTime: string | null;
  totalHours: number | null; isLate: boolean; status: string; type: string;
  userName: string; userRole: string; userId: string;
  taskType: string | null; taskId: string | null;
}

interface DashboardStats {
  totalClients: number; totalProjects: number; totalTasks: number;
  revenue: string; netProfit: string; totalPayouts: string;
  totalTaskExpenses: string; expenses: string; totalUserSalary: string;
  avgMargin: string; totalWorkingHours: number; lateCount: number; efficiencyRate: number;
}

interface DashboardData {
  address: string | null; latitude: number | null; longitude: number | null; radius: number;
  agencyName: string | null; operatorName: string | null; email: string | null;
  workingHours: WorkingDay[];
  subscription: { plan: string; status: string; maxUsers: number; geoFencingEnabled: boolean } | null;
  stats: DashboardStats;
  notifications: Notification[];
  recentPayouts: RecentPayout[];
  recentAttendance: RecentAttendance[];
  userAttendance: {
    id: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    // add any other fields you expect from userAttendance
  } | null;
  todaysAttendance: Array<{
    id: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    user: {
      name: string;
    } | null;
  }>;
  taskSessions: any[];
}

// ─── Edit Agency Modal ────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];


function EditAgencyModal({
  data, onClose, onSaved,
}: {
  data: DashboardData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    agencyName:   data.agencyName   ?? "",
    operatorName: data.operatorName ?? "",
    email:        data.email        ?? "",
    address:      data.address      ?? "",
    latitude:     data.latitude     ? String(data.latitude)  : "",
    longitude:    data.longitude    ? String(data.longitude) : "",
    radius:       String(data.radius ?? 100),
  });

  const defaultWH = DAYS.map((day) => {
    const existing = data.workingHours?.find((w) => w.day === day);
    return existing ?? { day, openTime: "09:00", closeTime: "17:00", isClosed: false };
  });

  const [workingHours, setWorkingHours] = useState<WorkingDay[]>(defaultWH);

  const updateWH = (idx: number, field: keyof WorkingDay, value: string | boolean) => {
    setWorkingHours((prev) => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          radius:    parseInt(form.radius),
          workingHours,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Save failed");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between rounded-t-[2.5rem] z-10">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tight">Edit Agency</h2>
            <p className="text-[9px] font-bold opacity-40 uppercase mt-0.5">Update agency profile & schedule</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3">Identity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Agency Name", key: "agencyName" },
                { label: "Operator Name", key: "operatorName" },
                { label: "Email", key: "email" },
                { label: "Address", key: "address" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3">Geofence</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Latitude",  key: "latitude",  type: "number", step: "any" },
                { label: "Longitude", key: "longitude", type: "number", step: "any" },
                { label: "Radius (m)", key: "radius",   type: "number", step: "1" },
              ].map(({ label, key, type, step }) => (
                <div key={key}>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">{label}</label>
                  <input
                    type={type} step={step}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3">Working Schedule</p>
            <div className="space-y-2">
              {workingHours.map((wh, idx) => (
                <div key={wh.day} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${wh.isClosed ? "bg-muted/10 border-border/30 opacity-50" : "bg-muted/30 border-border/50"}`}>
                  <span className="text-[9px] font-black uppercase w-10 shrink-0">{wh.day.slice(0,3)}</span>
                  <input
                    type="time" value={wh.openTime} disabled={wh.isClosed}
                    onChange={(e) => updateWH(idx, "openTime", e.target.value)}
                    className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none disabled:opacity-30 flex-1"
                  />
                  <span className="text-[9px] opacity-40">→</span>
                  <input
                    type="time" value={wh.closeTime} disabled={wh.isClosed}
                    onChange={(e) => updateWH(idx, "closeTime", e.target.value)}
                    className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none disabled:opacity-30 flex-1"
                  />
                  <button
                    onClick={() => updateWH(idx, "isClosed", !wh.isClosed)}
                    className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors shrink-0 ${wh.isClosed ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}
                  >
                    {wh.isClosed ? "Off" : "On"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification Drawer ──────────────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  if (type === "DEADLINE") return <AlertCircle size={12} className="text-rose-500 shrink-0" />;
  if (type === "ASSIGNMENT") return <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />;
  return <Bell size={12} className="text-primary shrink-0" />;
}

export function NotificationDrawer({ 
  notifications: initialNotifications, 
  onClose 
}: { 
  notifications: Notification[]; 
  onClose: () => void 
}) {
  // 1. Manage state locally so the UI updates immediately
  const [items, setItems] = useState<Notification[]>(initialNotifications);

  const handleAction = async (id: string, action: 'READ' | 'DELETE') => {
    // 2. Optimistic Update: Update UI before the server even responds
    if (action === 'READ') {
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } else {
      setItems(prev => prev.filter(n => n.id !== id));
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Priority Briefing</h2>
            {/* Show count of items still in the list */}
            <p className="text-[9px] opacity-40 font-bold uppercase mt-0.5">
              {items.filter(n => !n.isRead).length} unread
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        

        <div className="flex-1 p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <Bell size={32} className="mx-auto mb-3" />
              <p className="text-xs font-bold uppercase">All clear</p>
            </div>
          ) : (
            // We spread items into a new array to avoid mutating state, then sort
            [...items]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((notif) => (
                <div key={notif.id} className={`p-3 border-b transition-opacity ${notif.isRead ? 'opacity-40' : 'opacity-100'}`}>
                  <p className="text-sm font-bold">{notif.title}</p>
                  <p className="text-xs mt-1">{notif.message}</p>
                  
                  <div className="flex gap-4 mt-3">
                    {!notif.isRead && (
                      <button 
                        onClick={() => handleAction(notif.id, 'READ')}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button 
                      onClick={() => handleAction(notif.id, 'DELETE')}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-500 uppercase tracking-wider"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  color = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down";
  color?: string;
}) {
  return (
    <div className="bg-card border border-border p-6 rounded-3xl hover:border-primary/40 transition-all group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 14 })}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[9px] font-black ${trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
              {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            </div>
          )}
        </div>
        <p className={`text-4xl font-black italic tracking-tight ${color}`}>{value}</p>
        {sub && <p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p>}
      </div>
    </div>
  );
}

function MiniFinance({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-colors">
      <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
      <p className={`text-sm font-black italic ${color}`}>{value}</p>
    </div>
  );
}

// ─── Recent Payouts Feed ──────────────────────────────────────────────────────
function RecentPayoutsFeed({ payouts }: { payouts: RecentPayout[] }) {
  if (!payouts || payouts.length === 0) {
    return (
      <div className="text-center py-8 opacity-30">
        <CreditCard size={20} className="mx-auto mb-2" />
        <p className="text-[9px] font-bold uppercase">No recent payouts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payouts.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary shrink-0">
              {p.userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase truncate">{p.userName}</p>
              <p className="text-[8px] opacity-50 uppercase">{p.category}</p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <p className="text-xs font-black text-emerald-500">${Number(p.amount).toFixed(0)}</p>
            <p className="text-[8px] opacity-40">
              {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Recent Attendance Feed ───────────────────────────────────────────────────
interface AttendanceLog {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  totalHours: number | null;
  isLate: boolean;
  status: string;
  type: string;
  userName: string;
  userRole: string;
}

export function RecentAttendanceFeed({ logs }: { logs: AttendanceLog[] }) {
  if (!logs || logs.length === 0) {
    return <p className="text-[11px] text-muted-foreground py-4 text-center">No recent check-ins.</p>;
  }

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return null;
    const dateObj = new Date(isoString);
    const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {logs.map((log) => {
        const checkInFormatted = formatDateTime(log.checkInTime);
        const checkOutFormatted = formatDateTime(log.checkOutTime);

        return (
          <div key={log.id} className="flex flex-col gap-2 p-3 rounded-2xl hover:bg-muted/50 transition-colors border border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold">{log.userName}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{log.userRole.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {log.totalHours !== null && (
                  <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {log.totalHours.toFixed(1)} hrs
                  </span>
                )}
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${log.isLate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                  {log.isLate ? "Late" : "On Time"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30 text-[10px]">
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium uppercase tracking-wider text-[8px]">In</span>
                <span className="font-semibold text-foreground/90">{checkInFormatted}</span>
              </div>
              <div className="flex flex-col border-l border-border/50 pl-2">
                <span className="text-muted-foreground font-medium uppercase tracking-wider text-[8px]">Out</span>
                <span className="font-semibold text-foreground/90">
                  {checkOutFormatted ?? <span className="text-amber-500 font-medium animate-pulse">Active Now</span>}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function EmployeeDashboard({ user }: { user: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // 1. Fixed Search State Implementation
  const [searchTerm, setSearchTerm] = useState("");

  

  

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-widest opacity-40">Unauthorized Access</p>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

  // 1. Create the fetch function
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/summary");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Initial load
 
  useEffect(() => {
    fetchDashboardData(); // Initial load

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30,000ms = 30 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchDashboardData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/employees");
        const jsonRes = await res.json();
        setEmployees(jsonRes.employees ?? []);
      } catch (err) {
        console.error("Failed to fetch workforce arrays:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Fixed useMemo Filter and String matching Logic
  const filteredAndSorted = useMemo(() => {
    return employees.filter((e) => {
      if (!searchTerm.trim()) return true;
      const lowerSearch = searchTerm.toLowerCase();
      
      return (
        e.name?.toLowerCase().includes(lowerSearch) ||
        e.role?.toLowerCase().includes(lowerSearch) ||
        e.email?.toLowerCase().includes(lowerSearch) ||
        e.verifiedSkills?.some((s) => s.toLowerCase().includes(lowerSearch))
      );
    });
  }, [employees, searchTerm]);

  

  // 3. Define the action handler
// Inside EmployeeDashboard.tsx




  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 animate-pulse">Loading terminal data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-widest text-rose-500">Failed to load dashboard</p>
      </div>
    );
  }

  const unreadCount = data.notifications?.length ?? 0;

  const todayTaskSessions = data.taskSessions || [];

  const isOnline = (() => {
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const wh = data.workingHours?.find((d) => d.day === dayName);
    if (!wh || wh.isClosed) return false;
    const [oh, om] = wh.openTime.split(":").map(Number);
    const [ch, cm] = wh.closeTime.split(":").map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins >= oh * 60 + om && mins <= ch * 60 + cm;
  })();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-background">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">
            {isAdmin ? "Admin Console" : "Personal Workspace"}
          </p>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
            {isAdmin ? "Agency Command" : "Unit Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-3 bg-card border border-border rounded-2xl hover:border-primary/50 transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-background text-[8px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {isAdmin && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-full font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-colors"
            >
              <Edit3 size={12} /> Edit Agency
            </button>
          )}
        </div>
      </header>

      {/* ── SEARCH BAR INPUT ────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search operator name, role, or skill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      )}

      <AttendanceControl />

      {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users />}       label="Clients"      value={data.stats.totalClients ?? 0} />
        <StatCard icon={<Briefcase />}   label="Projects"     value={data.stats.totalProjects ?? 0} />
        <StatCard icon={<CheckSquare />} label="Active Tasks" value={data.stats.totalTasks ?? 0} />
        {isAdmin ? (
          <StatCard icon={<TrendingUp />} label="Net Profit" value={`$${data.stats.netProfit}`}
            color="text-emerald-500" trend={parseFloat(data.stats.netProfit) >= 0 ? "up" : "down"} />
        ) : (
          <StatCard icon={<Zap />} label="Efficiency" value={`${(data.stats.efficiencyRate * 100).toFixed(1)}%`}
            color="text-emerald-500" trend="up" />
        )}
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isAdmin ? (
            <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <DollarSign size={14} className="text-primary" /> Financial Performance
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MiniFinance label="Revenue"        value={`$${data.stats.revenue}`}           color="text-emerald-500" />
                <MiniFinance label="Total Payouts"  value={`$${data.stats.totalPayouts}`} />
                <MiniFinance label="Task Expenses"  value={`$${data.stats.totalTaskExpenses}`} />
                <MiniFinance label="Total Expenses" value={`$${data.stats.expenses}`}          color="text-rose-500" />
                <MiniFinance label="Total Salary"   value={`$${data.stats.totalUserSalary}`}   color="text-rose-500" />
                <MiniFinance label="Margin"         value={`${data.stats.avgMargin}%`} />
              </div>
            </section>
          ) : (
            <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <DollarSign size={14} className="text-primary" /> Compensation & Payouts
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-muted/30 rounded-2xl">
                  <p className="text-[9px] font-black opacity-40 uppercase mb-1">Pending Payout</p>
                  <p className="text-4xl font-black italic">${data.stats.totalPayouts}</p>
                </div>
                <div className="p-6 bg-muted/30 rounded-2xl">
                  <p className="text-[9px] font-black opacity-40 uppercase mb-1">Hours Logged</p>
                  <p className="text-4xl font-black italic">{data.stats.totalWorkingHours}h</p>
                </div>
              </div>
            </section>
          )}

          {isAdmin && (
            <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={14} className="text-primary" /> Recent Payouts
                </h3>
                <span className="text-[8px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase">
                  Last {data.recentPayouts?.length ?? 0}
                </span>
              </div>
              <RecentPayoutsFeed payouts={data.recentPayouts} />
            </section>
          )}

          <section className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 flex justify-between items-start">
              <div className="flex-1">
                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-3">Verified Office Node</h4>
                {data.address ? (
                  <p className="text-xl font-black italic leading-snug">{data.address}</p>
                ) : data.latitude && data.longitude ? (
                  <a href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-black text-primary underline">
                    View on Google Maps ↗
                  </a>
                ) : (
                  <p className="text-xl font-black italic opacity-40">No Location Set</p>
                )}
                {data.radius && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">
                      Geofence: {data.radius}m radius
                    </p>
                  </div>
                )}
              </div>
              <MapPin size={48} className="opacity-10 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 shrink-0 ml-4" />
            </div>
          </section>

          <section className="bg-card border border-border p-8 rounded-[2.5rem]">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={14} className="text-primary" /> Attendance Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-muted/30 rounded-2xl">
                <p className="text-[9px] font-black opacity-40 uppercase mb-1">
                  {isAdmin ? "Agency Total Hours" : "Your Hours"}
                </p>
                <p className="text-3xl font-black italic">{data.stats.totalWorkingHours}h</p>
              </div>
              <div className="p-5 bg-muted/30 rounded-2xl">
                <p className="text-[9px] font-black opacity-40 uppercase mb-1">Late Arrivals</p>
                <p className={`text-3xl font-black italic ${data.stats.lateCount > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                  {data.stats.lateCount}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {isAdmin && data.subscription && (
            <section className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all" />
              <ShieldCheck className="mb-4 text-primary relative z-10" size={24} />
              <h3 className="text-xl font-black uppercase italic tracking-tight relative z-10">Bundle Status</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2 relative z-10">
                <span className="bg-primary text-background text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                  {data.subscription.status}
                </span>
                <p className="text-[10px] font-black uppercase opacity-70">{data.subscription.plan} Plan</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[8px] font-black opacity-40 uppercase">Max Users</p>
                  <p className="text-sm font-black">{data.subscription.maxUsers}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[8px] font-black opacity-40 uppercase">Geofencing</p>
                  <p className={`text-sm font-black ${data.subscription.geoFencingEnabled ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.subscription.geoFencingEnabled ? "ON" : "OFF"}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="lg:col-span-1">
            <AttendanceCard todayLogs={data.todaysAttendance ?? []} />
          </div>

          <section className="bg-card border border-border p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={14} className="text-primary" /> Recent Check-ins
              </h3>
              <span className="text-[8px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase">
                Live
              </span>
            </div>
            <RecentAttendanceFeed logs={data.recentAttendance} />
          </section>

          <TaskSessionList sessions={todayTaskSessions} />

        </div>
      </div>

      {/* ── WORKING HOURS ─────────────────────────────────────────────────── */}
      <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} className="text-primary" /> Operational Schedule
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase mt-0.5">Cairo / Egypt Timezone</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/30 border-border/30"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-ping" : "bg-muted-foreground"}`} />
            <span className={`text-[8px] font-black uppercase ${isOnline ? "text-emerald-500" : "opacity-40"}`}>
              {isOnline ? "Online Now" : "Offline"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data.workingHours?.map((wh) => (
            <div key={wh.day} className={`p-4 rounded-2xl border transition-all ${wh.isClosed ? "bg-muted/10 border-border/20 grayscale opacity-50" : "bg-muted/30 border-border/50 hover:border-primary/40 hover:bg-muted/50"}`}>
              <p className="text-[9px] font-black uppercase tracking-tighter opacity-50 mb-3">{wh.day.substring(0, 3)}</p>
              {!wh.isClosed ? (
                <div className="space-y-1">
                  <p className="text-xs font-black italic tabular-nums">{wh.openTime}</p>
                  <div className="h-px w-4 bg-primary/20" />
                  <p className="text-xs font-black italic tabular-nums">{wh.closeTime}</p>
                </div>
              ) : (
                <p className="text-[9px] font-black text-rose-500/60 uppercase italic tracking-widest">Offline</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PERFORMANCE TABLE SECTION ───────────────────────────────────── */}
      {isAdmin && filteredAndSorted && filteredAndSorted.length > 0 && (
        <div className="mt-6">
          <PerformanceTable 
            performanceData={filteredAndSorted.map((emp) => ({
              name: emp.name,
              skills: emp.verifiedSkills || [],
              tasksCompleted: emp.completedTasksCount || 0,
              tasksCount: emp.tasksCount || 0,
              revenueGenerated: emp.totalRevenue || 0, 
              workingHours: emp.totalWorkingHours || 0,
              lateDays: emp.lateCount || 0,
              baseSalary: emp.baseSalary || 0, 
              commissions: emp.commissions || 0, 
              overtime: emp.overtime || 0,
              deductions: emp.deductions || 0, 
              extraPayouts: emp.totalPayouts || 0,
              expenses: emp.ledgerTotal || 0,
              efficiency: emp.efficiencyRate || 0,
              activeLeaves: emp.leaves?.filter((leave) => leave.status?.trim().toUpperCase() === "APPROVED").length || 0,
              walletBalance: emp.walletBalance || 0,
            }))} 
          />
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {notifOpen && (
        <NotificationDrawer notifications={data.notifications} onClose={() => setNotifOpen(false)} />
      )}

      {isAdmin && editOpen && (
        <EditAgencyModal
          data={data}
          onClose={() => setEditOpen(false)}
          onSaved={fetchDashboardData}
        />
      )}
    </div>
  );
}