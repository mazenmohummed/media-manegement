"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Briefcase, CheckSquare, TrendingUp,
  DollarSign, MapPin, Bell, Edit3, ShieldCheck,
  Clock, Zap, ArrowUpRight, ArrowDownRight,
  AlertCircle, CheckCircle2, X, Save, Loader2,
  CreditCard, UserCheck, Calendar,
} from "lucide-react";


// ─── Types ───────────────────────────────────────────────────────────────────

interface EmployeePerf {
  id: string; name: string; role: string; totalHours: number;
  lateCount: number; efficiencyRate: number; salary: number; totalPayout: number;
  userWallet?: number; // optional, server now includes walletBalance as userWallet
}

interface WorkingDay {
  day: string; openTime: string; closeTime: string; isClosed: boolean;
}

interface Notification {
  id: string; title: string; message: string; type: string; createdAt: string;
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

interface EmployeePerf {
  id: string; name: string; role: string; totalHours: number;
  lateCount: number; efficiencyRate: number; salary: number; totalPayout: number;
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
  employeePerformance: EmployeePerf[] | null;
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
        
        {/* Header */}
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

          {/* Basic Info */}
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

          {/* Location */}
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

          {/* Working Hours */}
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

function NotificationDrawer({ notifications, onClose }: { notifications: Notification[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Priority Briefing</h2>
            <p className="text-[9px] opacity-40 font-bold uppercase mt-0.5">{notifications.length} unread</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <Bell size={32} className="mx-auto mb-3" />
              <p className="text-xs font-bold uppercase">All clear</p>
            </div>
          ) : notifications.map((n) => (
            <div key={n.id} className="p-4 bg-card border border-border/50 rounded-2xl hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide">{n.title}</p>
                  <p className="text-xs opacity-60 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[8px] font-bold opacity-30 mt-2 uppercase">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
            {/* FIX: Explicitly typed clone template to satisfy the compiler props contract */}
            {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 14 })}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[9px] font-black ${trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
              {trend === "up"
                ? <ArrowUpRight size={12} />
                : <ArrowDownRight size={12} />}
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

  // Helper function to format timestamp into "MMM DD • HH:MM AM/PM"
  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return null;
    const dateObj = new Date(isoString);
    
    const dateStr = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr} • ${timeStr}`;
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {logs.map((log) => {
        const checkInFormatted = formatDateTime(log.checkInTime);
        const checkOutFormatted = formatDateTime(log.checkOutTime);

        return (
          <div key={log.id} className="flex flex-col gap-2 p-3 rounded-2xl hover:bg-muted/50 transition-colors border border-border/40">
            {/* Top row: User Info & Status Badge */}
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
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  log.isLate 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-emerald-500/10 text-emerald-500"
                }`}>
                  {log.isLate ? "Late" : "On Time"}
                </span>
              </div>
            </div>

            {/* Bottom row: Check-In and Check-Out Times */}
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
// ─── Performance Table ────────────────────────────────────────────────────────

// ─── Performance Table ───────────────────────────────────────────────────────

function PerformanceTable({ data }: { data: EmployeePerf[] }) {
  return (
    <section className="bg-card border border-border rounded-[3rem] overflow-hidden shadow-xl">
      <div className="p-8 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Users size={14} className="text-primary" /> Team Performance
          </h3>
          <p className="text-[9px] opacity-40 font-bold uppercase mt-0.5">All personnel · Current cycle</p>
        </div>
        <span className="text-[8px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-widest">
          {data.length} Members
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              {["Agent", "Role", "Hours", "Late", "Efficiency", "Salary", "Payout"].map((h) => (
                <th key={h} className="text-left p-4 text-[8px] font-black uppercase tracking-widest opacity-40">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((emp) => (
              <tr key={emp.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold">{emp.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-[8px] font-black px-2 py-0.5 bg-muted rounded uppercase tracking-widest">
                    {emp.role}
                  </span>
                </td>
                <td className="p-4 text-xs font-black">{emp.totalHours}h</td>
                <td className="p-4">
                  <span className={`text-xs font-black ${emp.lateCount > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                    {emp.lateCount}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(emp.efficiencyRate * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-black opacity-60">
                      {(emp.efficiencyRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="p-4 text-xs font-black">${emp.salary.toFixed(0)}</td>
                <td className="p-4 text-xs font-black text-emerald-500">${emp.totalPayout.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function EmployeeDashboard({ user }: { user: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-widest opacity-40">Unauthorized Access</p>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

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

        {/* LEFT COL (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Financial panel */}
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

          {/* Recent Payouts (admin) */}
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

          {/* Location node */}
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

          {/* Attendance summary */}
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

        {/* RIGHT COL (1/3) */}
        <div className="space-y-6">

          {/* Subscription */}
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

          {/* Recent check-ins */}
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

          {/* Notifications preview */}
          <section className="bg-card border border-border p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Bell size={14} className="text-primary" /> Alerts
              </h3>
              {unreadCount > 0 && (
                <button onClick={() => setNotifOpen(true)}
                  className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">
                  View all →
                </button>
              )}
            </div>
            {unreadCount === 0 ? (
              <div className="text-center py-6 opacity-30">
                <CheckCircle2 size={20} className="mx-auto mb-2" />
                <p className="text-[9px] font-bold uppercase">No alerts</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl">
                    <NotifIcon type={n.type} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase truncate">{n.title}</p>
                      <p className="text-[9px] opacity-50 truncate">{n.message}</p>
                    </div>
                  </div>
                ))}
                {unreadCount > 3 && (
                  <button onClick={() => setNotifOpen(true)}
                    className="w-full text-center text-[8px] font-black uppercase opacity-40 hover:opacity-80 transition-opacity py-2">
                    +{unreadCount - 3} more
                  </button>
                )}
              </div>
            )}
          </section>
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

      {/* ── PERFORMANCE TABLE ─────────────────────────────────────────────── */}
       {isAdmin && data.employeePerformance && data.employeePerformance.length > 0 && (
        <section className="bg-card border border-border rounded-[3rem] overflow-hidden">
          <div className="p-8 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-primary" /> Team Performance
              </h3>
              <p className="text-[9px] opacity-40 font-bold uppercase mt-0.5">All personnel · Current cycle</p>
            </div>
            <span className="text-[8px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-widest">
              {data.employeePerformance.length} Members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  {["Agent", "Role", "Hours", "Late", "Efficiency", "Base Salary", "Payout"].map((h) => (
                    <th key={h} className="text-left p-4 text-[8px] font-black uppercase tracking-widest opacity-40">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.employeePerformance.map((emp) => (
                  <tr key={emp.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold">{emp.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[8px] font-black px-2 py-0.5 bg-muted rounded uppercase tracking-widest">
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-black">{emp.totalHours}h</td>
                    <td className="p-4">
                      <span className={`text-xs font-black ${emp.lateCount > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                        {emp.lateCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(emp.efficiencyRate * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black opacity-60">
                          {(emp.efficiencyRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-black">
                      ${Number(emp.salary ?? 0).toFixed(0)}
                    </td>
                    <td className="p-4 text-xs font-black text-emerald-500">
                      ${Number(emp.totalPayout ?? 0).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {notifOpen && (
        <NotificationDrawer notifications={data.notifications} onClose={() => setNotifOpen(false)} />
      )}

      {isAdmin && editOpen && (
        <EditAgencyModal
          data={data}
          onClose={() => setEditOpen(false)}
          onSaved={fetchDashboard}
        />
      )}
    </div>
  );
}