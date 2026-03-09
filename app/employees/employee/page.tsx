"use client";

import React, { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { Calendar as CalendarIcon, Activity, Zap, Wallet, Timer } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

// --- CALENDAR SETUP ---
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- TYPES ---
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

interface TaskExecution {
  id: string;
  projectName: string;
  serviceType: string;
  fee: number;
  plannedHours: number;
  actualHours: number;
  deadline: string;
  completedAt: string;
  paymentStatus: "Paid" | "Pending";
}

interface AttendanceEvent {
  id: string;
  employeeName: string;
  type: "Present" | "Sick" | "Off";
  date: string;
}

export default function EmployeePerformancePage() {
  // 1. STATE - Data
  const [employee] = useState({
    name: "Ahmed Hassan",
    role: "Senior Designer",
    joinedDate: "2025-06-01",
  });

  const [history] = useState<TaskExecution[]>([
    { id: "h1", projectName: "Nike Winter", serviceType: "Design", fee: 550, plannedHours: 10, actualHours: 8, deadline: "2026-02-10", completedAt: "2026-02-09", paymentStatus: "Paid" },
    { id: "h2", projectName: "TechCorp App", serviceType: "Design", fee: 400, plannedHours: 5, actualHours: 7, deadline: "2026-03-01", completedAt: "2026-03-02", paymentStatus: "Pending" },
    { id: "h3", projectName: "Starbucks UI", serviceType: "Design", fee: 900, plannedHours: 15, actualHours: 12, deadline: "2026-02-25", completedAt: "2026-02-24", paymentStatus: "Paid" },
    { id: "h4", projectName: "Zara Lookbook", serviceType: "Design", fee: 300, plannedHours: 4, actualHours: 4, deadline: "2026-03-05", completedAt: "2026-03-05", paymentStatus: "Pending" },
  ]);

  const [attendanceRecords] = useState<AttendanceEvent[]>([
    { id: "1", employeeName: "Ahmed Hassan", type: "Present", date: "2026-03-01" },
    { id: "2", employeeName: "Ahmed Hassan", type: "Sick", date: "2026-03-02" },
    { id: "3", employeeName: "Ahmed Hassan", type: "Off", date: "2026-03-05" },
  ]);

  // 2. STATE - Filters
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  // 3. FILTER LOGIC
  const filteredHistory = useMemo(() => {
    return history.filter((task) => {
      const taskDate = new Date(task.completedAt);
      const year = 2026; 

      if (filterMode === "PRESET") {
        if (activePreset === "ALL") return true;
        if (activePreset === "Q1") return isWithinInterval(taskDate, { start: startOfQuarter(new Date(year, 0, 1)), end: endOfQuarter(new Date(year, 0, 1)) });
        if (activePreset === "Q2") return isWithinInterval(taskDate, { start: startOfQuarter(new Date(year, 3, 1)), end: endOfQuarter(new Date(year, 3, 1)) });
      }

      if (filterMode === "MONTH") {
        const m = parseInt(selectedMonth);
        return isWithinInterval(taskDate, { start: startOfMonth(new Date(year, m, 1)), end: endOfMonth(new Date(year, m, 1)) });
      }

      if (filterMode === "CUSTOM" && dateRange.start && dateRange.end) {
        return isWithinInterval(taskDate, { start: new Date(dateRange.start), end: new Date(dateRange.end) });
      }

      return true;
    });
  }, [history, filterMode, activePreset, selectedMonth, dateRange]);

  // 4. MEMOIZED CALCULATIONS
  const stats = useMemo(() => {
    const totalTasks = filteredHistory.length || 1;
    const onTimeTasks = filteredHistory.filter(t => new Date(t.completedAt) <= new Date(t.deadline)).length;
    const totalActualHours = filteredHistory.reduce((sum, t) => sum + t.actualHours, 0);
    const totalPlannedHours = filteredHistory.reduce((sum, t) => sum + t.plannedHours, 0);
    const totalEarned = filteredHistory.reduce((sum, t) => sum + t.fee, 0);

    return {
      punctualityRate: (onTimeTasks / totalTasks) * 100,
      avgEfficiency: totalActualHours > 0 ? (totalPlannedHours / totalActualHours) * 100 : 0,
      avgTaskDuration: totalActualHours / totalTasks,
      totalEarned,
      totalActualHours,
      pendingPayout: filteredHistory.filter(t => t.paymentStatus === "Pending").reduce((s, t) => s + t.fee, 0)
    };
  }, [filteredHistory]);

  const calendarEvents = useMemo(() => {
    return attendanceRecords.map(record => ({
      title: `${record.type}`,
      start: new Date(record.date),
      end: new Date(record.date),
      resource: { type: record.type }
    }));
  }, [attendanceRecords]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-background min-h-screen text-foreground space-y-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm transition-colors">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-3xl font-black text-primary-foreground italic shadow-lg shadow-primary/20">
            {employee.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">{employee.name}</h1>
            <p className="text-primary font-bold text-xs uppercase tracking-[0.2em]">{employee.role}</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Efficiency</p>
            <p className="text-2xl font-black font-mono text-emerald-500">{stats.avgEfficiency.toFixed(0)}%</p>
          </div>
          <div className="text-right border-l border-border pl-8">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Earnings</p>
            <p className="text-2xl font-black font-mono text-foreground">${stats.totalEarned.toLocaleString()}</p>
          </div>
        </div>
      </header>

      {/* FILTER ENGINE SECTION */}
      <div className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filter Mode</h2>
            <div className="flex bg-muted p-1 rounded-xl border border-border w-fit">
              {(["PRESET", "MONTH", "CUSTOM"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    filterMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Selection</h2>
            <div className="flex flex-wrap items-center gap-4">
              {filterMode === "PRESET" && (
                <select 
                  value={activePreset} 
                  onChange={(e) => setActivePreset(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-primary/20 transition-all cursor-pointer text-foreground"
                >
                  <option value="ALL">All Recorded Time</option>
                  <option value="Q1">Q1 (Jan — Mar)</option>
                  <option value="Q2">Q2 (Apr — Jun)</option>
                </select>
              )}

              {filterMode === "MONTH" && (
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-primary/20 transition-all cursor-pointer text-foreground"
                >
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              )}

              {filterMode === "CUSTOM" && (
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold text-foreground outline-none focus:ring-2 ring-primary/20 transition-all"
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  />
                  <span className="text-muted-foreground text-[10px] font-black tracking-widest">TO</span>
                  <input 
                    type="date" 
                    className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold text-foreground outline-none focus:ring-2 ring-primary/20 transition-all"
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Punctuality" value={`${stats.punctualityRate.toFixed(0)}%`} sub="On-time rate" color="text-primary" icon={<Zap className="w-4 h-4" />} />
        <KPICard title="Avg Duration" value={`${stats.avgTaskDuration.toFixed(1)}h`} sub="Per deliverable" color="text-foreground" icon={<Timer className="w-4 h-4" />} />
        <KPICard title="Total Capacity" value={`${stats.totalActualHours}h`} sub="Burn rate" color="text-orange-500" icon={<Activity className="w-4 h-4" />} />
        <KPICard title="Pending" value={`$${stats.pendingPayout}`} sub="Awaiting payout" color="text-orange-600" icon={<Wallet className="w-4 h-4" />} />
      </section>

      {/* TASK HISTORY & ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-2">Work & Payment History</h2>
          <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <th className="p-6">Project</th>
                      <th className="p-6">Time (Est/Act)</th>
                      <th className="p-6">Result</th>
                      <th className="p-6 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHistory.map((task) => {
                      const isLate = new Date(task.completedAt) > new Date(task.deadline);
                      return (
                        <tr key={task.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="p-6">
                            <p className="font-black text-foreground text-sm uppercase italic">{task.projectName}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">{task.serviceType}</p>
                          </td>
                          <td className="p-6 font-mono text-xs">
                            <span className="text-muted-foreground">{task.plannedHours}h</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className={task.actualHours > task.plannedHours ? "text-orange-600 font-bold" : "text-emerald-600 font-bold"}>
                              {task.actualHours}h
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isLate ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                              {isLate ? "Delayed" : "On-Time"}
                            </span>
                          </td>
                          <td className="p-6 text-right font-mono font-black text-foreground">
                            ${task.fee}
                            <p className={`text-[8px] uppercase tracking-tighter ${task.paymentStatus === "Paid" ? "text-emerald-500" : "text-orange-500"}`}>
                              {task.paymentStatus}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* SIDEBAR ANALYSIS */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-2">Efficiency Analysis</h2>
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm space-y-8 transition-colors">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Internal Flow</p>
                <p className="text-xs font-bold text-foreground">{stats.avgEfficiency > 100 ? "Caution" : "Optimal"}</p>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-primary" style={{ width: `${Math.min(stats.avgEfficiency, 100)}%` }} />
                {stats.avgEfficiency > 100 && <div className="h-full bg-orange-500" style={{ width: `${stats.avgEfficiency - 100}%` }} />}
              </div>
            </div>
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Verified Skills</h3>
              <div className="flex flex-wrap gap-2">
                {["Speed UI", "Branding", "Direct Mail"].map(s => (
                  <span key={s} className="px-3 py-1.5 bg-foreground text-background text-[9px] font-black uppercase rounded-xl italic transition-colors">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CALENDAR SECTION */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 px-2">
          <CalendarIcon className="w-3 h-3" /> Attendance Ledger
        </h2>
        <div className="bg-card p-4 md:p-8 border border-border rounded-[2.5rem] shadow-sm h-[600px] transition-colors overflow-hidden">
          <style>{`
            .rbc-calendar { color: var(--foreground); }
            .rbc-off-range-bg { background: var(--muted) !important; opacity: 0.3; }
            .rbc-today { background: var(--primary) !important; opacity: 0.05; }
            .rbc-header { padding: 10px !important; font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; color: var(--muted-foreground) !important; border-bottom: 1px solid var(--border) !important; }
            .rbc-month-view { border-color: var(--border) !important; border-radius: 20px; overflow: hidden; }
            .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border) !important; }
            .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border) !important; }
          `}</style>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            date={currentDate}
            onNavigate={d => setCurrentDate(d)}
            view={currentView}
            onView={v => setCurrentView(v)}
            eventPropGetter={(event: any) => ({
              style: {
                backgroundColor: event.resource.type === "Sick" ? "#ef4444" : event.resource.type === "Off" ? "#94a3b8" : "#10b981",
                borderRadius: '8px',
                border: 'none',
                fontSize: '9px',
                fontWeight: '900',
                padding: '4px 8px',
                textTransform: 'uppercase'
              }
            })}
          />
        </div>
      </section>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function KPICard({ title, value, sub, color, icon }: { title: string, value: string, sub: string, color: string, icon: React.ReactNode }) {
  return (
    <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm transition-all hover:border-primary/20 group">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
        <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
      </div>
      <p className={`text-4xl font-black font-mono italic tracking-tighter ${color}`}>{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">{sub}</p>
    </div>
  );
}