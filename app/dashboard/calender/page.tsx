"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  Briefcase, 
  Clock, 
  PlaneTakeoff, 
  CheckCircle2, 
  AlertCircle,
  X,
  Check,
  ListTodo,
  UserCheck,
  SlidersHorizontal,
  CalendarDays,
  Search
} from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

interface PendingLeaveRow {
  userId: string;
  userName: string;
  leaveIndex: number;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { "en-US": enUS },
});

export default function UnifiedCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [visibleLayers, setVisibleLayers] = useState(["TASK", "ATTENDANCE", "LEAVE"]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeaveRow[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. PRODUCTION TASKS FILTERS STATE
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // 2. STAFF ATTENDANCE FILTERS STATE
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>("ALL");
  const [attendanceStartFilter, setAttendanceStartFilter] = useState<string>("");
  const [attendanceEndFilter, setAttendanceEndFilter] = useState<string>("");
  const [attendanceProfessionalFilter, setAttendanceProfessionalFilter] = useState<string>("");
  const [attendancePunctualityFilter, setAttendancePunctualityFilter] = useState<string>("ALL");

  // 3. LEAVE BOARD FILTERS STATE
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("ALL");
  const [leaveStartFilter, setLeaveStartFilter] = useState<string>("");
  const [leaveEndFilter, setLeaveEndFilter] = useState<string>("");

  // MASTER DATA REFRESH SYNCHRONIZER
  const refreshMasterCalendarData = async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      
      const formattedData = data.map((event: any) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        if (start.getTime() === end.getTime()) {
          end.setHours(23, 59, 59, 999);
        }
        return { ...event, start, end, allDay: true };
      });
      setEvents(formattedData);

      const usersRes = await fetch("/api/users/leaves"); 
      if (usersRes.ok) {
        const structuralUserData = await usersRes.json();
        const compiledPendingRows: PendingLeaveRow[] = [];
        
        const usersArray = Array.isArray(structuralUserData) 
          ? structuralUserData 
          : (structuralUserData.users || []);

        usersArray.forEach((user: any) => {
          const leavesList = user.leaves || [];
          
          leavesList.forEach((l: any, index: number) => {
            const currentStatus = String(l.status || "").trim().toLowerCase();
            
            if (currentStatus === "pending" || currentStatus === "approved") { 
              compiledPendingRows.push({
                userId: user.id || user._id,
                userName: user.name || "Unknown Professional",
                leaveIndex: index,
                type: l.type || "General",
                startDate: l.startDate,
                endDate: l.endDate,
                status: l.status
              });
            }
          });
        });
        setPendingLeaves(compiledPendingRows);
      }
    } catch (err) {
      console.error("Calendar operational sync error configuration maps:", err);
    }
  };

  useEffect(() => {
    refreshMasterCalendarData();
  }, []);

  const filteredEvents = useMemo(() => 
    events.filter(e => visibleLayers.includes(e.resource.type)),
    [events, visibleLayers]
  );

  // Memorize core baseline metrics unfiltered arrays
  const unfilteredProductionTasks = useMemo(() => events.filter(e => e.resource?.type === "TASK"), [events]);
  const unfilteredAttendanceLogs = useMemo(() => events.filter(e => e.resource?.type === "ATTENDANCE"), [events]);

  // FILTERED: PRODUCTION TASKS
  const filteredProductionTasks = useMemo(() => {
    return unfilteredProductionTasks.filter((task) => {
      if (statusFilter !== "ALL" && (task.resource?.status || "").toUpperCase() !== statusFilter) return false;
      const tStart = task.start.toISOString().split("T")[0];
      const tEnd = task.end.toISOString().split("T")[0];
      if (startDateFilter && tEnd < startDateFilter) return false;
      if (endDateFilter && tStart > endDateFilter) return false;
      return true;
    });
  }, [unfilteredProductionTasks, statusFilter, startDateFilter, endDateFilter]);

  // FILTERED: STAFF ATTENDANCE
  const filteredAttendanceLogs = useMemo(() => {
    return unfilteredAttendanceLogs.filter((log) => {
      // 1. UPDATED: Shift Execution Status Filter Logic (Active vs Completed)
      if (attendanceStatusFilter !== "ALL") {
        const hasCheckedOut = !!log.resource?.checkOutTime;
        if (attendanceStatusFilter === "ACTIVE" && hasCheckedOut) return false;
        if (attendanceStatusFilter === "COMPLETED" && !hasCheckedOut) return false;
      }
      
      // 2. Target Shift Window Dates Filtering
      const logDate = log.start.toISOString().split("T")[0];
      if (attendanceStartFilter && logDate < attendanceStartFilter) return false;
      if (attendanceEndFilter && logDate > attendanceEndFilter) return false;

      // 3. Team Professional Search Text Parsing
      const professionalName = (log.title?.replace("IN: ", "") || "").toLowerCase();
      if (attendanceProfessionalFilter && !professionalName.includes(attendanceProfessionalFilter.toLowerCase())) return false;

      // 4. Advanced Shift Punctuality Metrics Evaluation Filter
      if (attendancePunctualityFilter !== "ALL") {
        let evaluatedPunctuality = "ON_TIME";

        if (!log.resource?.taskStartDate || !log.resource?.taskEndDate) {
          evaluatedPunctuality = log.resource?.isLate ? "LATE" : "ON_TIME";
        } else {
          const checkIn = new Date(log.start);
          const checkOut = log.resource?.checkOutTime ? new Date(log.resource.checkOutTime) : null;
          const targetStart = new Date(log.resource.taskStartDate);
          const targetEnd = new Date(log.resource.taskEndDate);

          const checkInLate = checkIn > targetStart;
          const completedEarly = checkOut ? checkOut < targetEnd : false;

          if (checkInLate && completedEarly) {
            evaluatedPunctuality = "LATE_AND_EARLY";
          } else if (checkInLate) {
            evaluatedPunctuality = "LATE";
          } else if (completedEarly) {
            evaluatedPunctuality = "EARLY_TERMINATION";
          }
        }

        if (attendancePunctualityFilter !== evaluatedPunctuality) return false;
      }

      return true;
    });
  }, [unfilteredAttendanceLogs, attendanceStatusFilter, attendanceStartFilter, attendanceEndFilter, attendanceProfessionalFilter, attendancePunctualityFilter]);

  // FILTERED: LEAVE REVIEW BOARD ITEMS
  const filteredLeaveRows = useMemo(() => {
    return pendingLeaves.filter((row) => {
      if (leaveTypeFilter !== "ALL" && row.type.toUpperCase() !== leaveTypeFilter.toUpperCase()) return false;
      const rStart = row.startDate.split("T")[0];
      const rEnd = row.endDate.split("T")[0];
      if (leaveStartFilter && rEnd < leaveStartFilter) return false;
      if (leaveEndFilter && rStart > leaveEndFilter) return false;
      return true;
    });
  }, [pendingLeaves, leaveTypeFilter, leaveStartFilter, leaveEndFilter]);

  const handleLeaveDecision = async (userId: string, leaveIndex: number, action: "APPROVED" | "REJECTED") => {
    setProcessingId(`${userId}-${leaveIndex}`);
    try {
      const res = await fetch(`/api/leaves/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveIndex, status: action })
      });
      if (res.ok) {
        await refreshMasterCalendarData();
      }
    } catch (err) {
      console.error("Failed to execute administrative update action:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  };

  const eventPropGetter = (event: any) => {
    const colors: any = {
      TASK: event.resource.status === "Completed" ? "#10b981" : "#2563eb",
      ATTENDANCE: "#8b5cf6",
      LEAVE: event.resource.status === "Approved" ? "#f97316" : "#ef4444",
    };
    return { style: { backgroundColor: colors[event.resource.type], borderRadius: '6px', fontSize: '10px', border: 'none' } };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 p-6 max-w-[1600px] mx-auto space-y-6">
      
      {/* SECTION 1: SIDEBAR CONTROLS & INTELLIGENCE */}
      <div className="xl:col-span-1 space-y-6">
        <aside className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
            <h1 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2">
              <CalendarIcon className="text-blue-600" /> Pipeline
            </h1>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">View Filters</p>
              <LayerToggle label="Production Tasks" active={visibleLayers.includes("TASK")} onClick={() => toggleLayer("TASK")} icon={<Briefcase size={14}/>} color="bg-blue-600" />
              <LayerToggle label="Staff Attendance" active={visibleLayers.includes("ATTENDANCE")} onClick={() => toggleLayer("ATTENDANCE")} icon={<Clock size={14}/>} color="bg-purple-500" />
              <LayerToggle label="Leave Registry" active={visibleLayers.includes("LEAVE")} onClick={() => toggleLayer("LEAVE")} icon={<PlaneTakeoff size={14}/>} color="bg-orange-500" />
            </div>
          </div>

          <div className="bg-slate-950 text-white p-6 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Metrics</p>
            <div className="flex justify-between items-center"><span className="text-xs opacity-60">Active Tasks</span><span className="font-black text-lg">{unfilteredProductionTasks.length}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs opacity-60">Staff Checked In</span><span className="font-black text-lg text-purple-400">{unfilteredAttendanceLogs.length}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs opacity-60">Staff on Leave</span><span className="font-black text-lg text-orange-400">{events.filter(e => e.resource.type === "LEAVE" && e.resource.status === "Approved").length}</span></div>
          </div>
        </aside>
      </div>

      {/* Calendar Area */}
      <div className="xl:col-span-3">
        <main className="h-full">
          <div className="bg-card p-8 border border-border rounded-[3rem] shadow-sm min-h-[750px] h-full">
            <Calendar localizer={localizer} events={filteredEvents} startAccessor="start" endAccessor="end" eventPropGetter={eventPropGetter} onNavigate={(newDate) => setCurrentDate(newDate)} date={currentDate} view={currentView} onView={(newView) => setCurrentView(newView)} views={['month', 'week', 'day', 'agenda']} className="font-sans text-sm custom-calendar" popup={true} style={{ height: "100%" }} />
          </div>
        </main>
      </div>

      {/* PRODUCTION TASKS OPERATION REGISTRY BOARD */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4 mt-6">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListTodo size={18} className="text-blue-600" />
            <div>
              <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Production Tasks Operational Log</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Active tasks pipeline monitoring context records</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-background/50 p-2 rounded-2xl border border-border/60">
            <div className="flex items-center gap-1.5 px-2 text-muted-foreground"><SlidersHorizontal size={12}/><span className="text-[9px] font-black uppercase tracking-wider">Filters:</span></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-wider px-3 py-1.5 focus:outline-none text-foreground">
              <option value="ALL">All Execution Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1">
              <CalendarDays size={11} className="text-muted-foreground" />
              <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              <span className="text-[9px] text-muted-foreground px-1">→</span>
              <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              {(startDateFilter || endDateFilter || statusFilter !== "ALL") && (
                <button onClick={() => { setStartDateFilter(""); setEndDateFilter(""); setStatusFilter("ALL"); }} className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground"><X size={12} /></button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5 font-black">
              <tr>
                <th className="p-5 font-black">Task Title / Scope</th>
                <th className="p-5 font-black">Assigned Professional</th>
                <th className="p-5 font-black">Target Schedule Window</th>
                <th className="p-5 font-black">Execution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredProductionTasks.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">No matching tasks found.</td></tr>
              ) : (
                filteredProductionTasks.map((task, idx) => {
                  const rawTaskId = task.id ? task.id.replace("task-", "") : idx;
                  return (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors group">
                      <td className="p-5 font-black uppercase tracking-wide text-foreground">
                        <Link href={`/dashboard/tasks/${rawTaskId}`} className="text-blue-600 hover:underline group-hover:text-blue-500 transition-colors">{task.title}</Link>
                      </td>
                      <td className="p-5 font-black uppercase tracking-wider text-muted-foreground text-[10px]">{task.resource?.assignee || "Unassigned"}</td>
                      <td className="p-5 font-mono text-muted-foreground">{task.start.toLocaleDateString()} → {task.end.toLocaleDateString()}</td>
                      <td className="p-5">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${task.resource?.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-600"}`}>{task.resource?.status || "Active Pipeline"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* STAFF ATTENDANCE CHECK-IN LOG BOARD */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-purple-500" />
            <div>
              <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Staff Attendance Ledger</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Real-time daily professional shift timestamp validations</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-background/50 p-2 rounded-2xl border border-border/60">
            <div className="flex items-center gap-1.5 px-2 text-muted-foreground">
              <SlidersHorizontal size={12}/>
              <span className="text-[9px] font-black uppercase tracking-wider">Filters:</span>
            </div>

            {/* FILTER 1: TEAM PROFESSIONAL SEARCH */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1">
              <Search size={11} className="text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search Professional..." 
                value={attendanceProfessionalFilter}
                onChange={(e) => setAttendanceProfessionalFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wide focus:outline-none text-foreground placeholder:text-muted-foreground/60 w-36"
              />
            </div>

            {/* FILTER 2: PUNCTUALITY STATUS SELECTION */}
            <select 
              value={attendancePunctualityFilter} 
              onChange={(e) => setAttendancePunctualityFilter(e.target.value)} 
              className="bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-wider px-3 py-1.5 focus:outline-none text-foreground"
            >
              <option value="ALL">All Punctuality Statuses</option>
              <option value="ON_TIME">On Time</option>
              <option value="LATE">Late Check-In</option>
              <option value="EARLY_TERMINATION">Early Termination</option>
              <option value="LATE_AND_EARLY">Late & Left Early</option>
            </select>

            {/* FILTER 3: LOG SHIFT EXECUTION STATUS (UPDATED: ACTIVE, COMPLETED) */}
            <select 
              value={attendanceStatusFilter} 
              onChange={(e) => setAttendanceStatusFilter(e.target.value)} 
              className="bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-wider px-3 py-1.5 focus:outline-none text-foreground"
            >
              <option value="ALL">All Shift Statuses</option>
              <option value="ACTIVE">Active Shift</option>
              <option value="COMPLETED">Completed</option>
            </select>
            
            {/* FILTER 4: TARGET DATE RANGE BOUNDS */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1">
              <CalendarDays size={11} className="text-muted-foreground" />
              <input type="date" value={attendanceStartFilter} onChange={(e) => setAttendanceStartFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              <span className="text-[9px] text-muted-foreground px-1">→</span>
              <input type="date" value={attendanceEndFilter} onChange={(e) => setAttendanceEndFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              
              {(attendanceStartFilter || attendanceEndFilter || attendanceStatusFilter !== "ALL" || attendanceProfessionalFilter || attendancePunctualityFilter !== "ALL") && (
                <button 
                  onClick={() => { 
                    setAttendanceStartFilter(""); 
                    setAttendanceEndFilter(""); 
                    setAttendanceStatusFilter("ALL"); 
                    setAttendanceProfessionalFilter("");
                    setAttendancePunctualityFilter("ALL");
                  }} 
                  className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5 font-black">
              <tr>
                <th className="p-5 font-black">Team Professional</th>
                <th className="p-5 font-black">Check-In</th>
                <th className="p-5 font-black">Check-Out</th>
                <th className="p-5 font-black">Total Hours</th>
                <th className="p-5 font-black">Production Task Assignment</th>
                <th className="p-5 font-black">Punctuality</th>
                <th className="p-5 font-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredAttendanceLogs.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">No attendance records logged matching criteria.</td></tr>
              ) : (
                filteredAttendanceLogs.map((log, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors group">
                      <td className="p-5 font-black uppercase tracking-wide text-foreground">{log.title?.replace("IN: ", "") || "Unknown Professional"}</td>
                      <td className="p-5 font-mono text-muted-foreground text-[11px]">{log.start.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-5 font-mono text-muted-foreground text-[11px]">
                        {log.resource?.checkOutTime ? new Date(log.resource.checkOutTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest animate-pulse">Active Shift</span>}
                      </td>
                      <td className="p-5 font-mono text-foreground font-black">{log.resource?.totalHours != null ? `${Number(log.resource.totalHours).toFixed(1)}h` : <span className="text-muted-foreground opacity-50">—</span>}</td>
                      
                      <td className="p-5">
                        {log.resource?.taskId ? (
                          <Link 
                            href={`/dashboard/tasks/${log.resource.taskId}`} 
                            className="text-purple-600 hover:underline font-black uppercase tracking-wide text-[11px]"
                          >
                            {log.resource?.taskName || "View Assignment Details"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic opacity-50 text-[10px] uppercase tracking-wider">
                            {log.resource?.method === "OFFICE" ? "General Office Shift" : "No Task Context"}
                          </span>
                        )}
                      </td>

                      <td className="p-5">
                        {(() => {
                          if (!log.resource?.taskStartDate || !log.resource?.taskEndDate) {
                            return (
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${log.resource?.isLate ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                                {log.resource?.isLate ? "Late" : "On Time"}
                              </span>
                            );
                          }

                          const checkIn = new Date(log.start);
                          const checkOut = log.resource?.checkOutTime ? new Date(log.resource.checkOutTime) : null;
                          const targetStart = new Date(log.resource.taskStartDate);
                          const targetEnd = new Date(log.resource.taskEndDate);

                          const checkInLate = checkIn > targetStart;
                          const completedEarly = checkOut ? checkOut < targetEnd : false;

                          if (checkInLate && completedEarly) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-rose-500/10 text-rose-500">Late Check-In</span>
                                <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider bg-amber-500/10 text-amber-600">Left Early</span>
                              </div>
                            );
                          }

                          if (checkInLate) {
                            return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-rose-500/10 text-rose-500">Late</span>;
                          }

                          if (completedEarly) {
                            return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-amber-500/10 text-amber-600">Early Termination</span>;
                          }

                          return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-emerald-500/10 text-emerald-500">On Time</span>;
                        })()}
                      </td>
                      <td className="p-5">
                        {/* RENDERS DYNAMIC SYSTEM TYPE INSTEAD OF BASE PRISMA ENUM STRING VALUES */}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${log.resource?.checkOutTime ? "bg-purple-500/10 text-purple-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {log.resource?.checkOutTime ? "Completed" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* LEAVE MANAGEMENT REVIEW DASHBOARD */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PlaneTakeoff size={18} className="text-orange-500" />
            <div>
              <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Leave Operations Review Board</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Pending internal corporate time-off pipeline analysis</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-background/50 p-2 rounded-2xl border border-border/60">
            <div className="flex items-center gap-1.5 px-2 text-muted-foreground"><SlidersHorizontal size={12}/><span className="text-[9px] font-black uppercase tracking-wider">Filters:</span></div>
            <select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)} className="bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-wider px-3 py-1.5 focus:outline-none text-foreground">
              <option value="ALL">All Categories</option>
              <option value="SICK">Sick Leave</option>
              <option value="ANNUAL">Annual Leave</option>
              <option value="MATERNITY">Maternity Leave</option>
              <option value="CASUAL">Casual</option>
            </select>
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1">
              <CalendarDays size={11} className="text-muted-foreground" />
              <input type="date" value={leaveStartFilter} onChange={(e) => setLeaveStartFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              <span className="text-[9px] text-muted-foreground px-1">→</span>
              <input type="date" value={leaveEndFilter} onChange={(e) => setLeaveEndFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-mono focus:outline-none text-foreground" />
              {(leaveStartFilter || leaveEndFilter || leaveTypeFilter !== "ALL") && (
                <button onClick={() => { setLeaveStartFilter(""); setLeaveEndFilter(""); setLeaveTypeFilter("ALL"); }} className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground"><X size={12} /></button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5 font-black">
              <tr>
                <th className="p-5 font-black">Creative Professional</th>
                <th className="p-5 font-black">Leave Category</th>
                <th className="p-5 font-black">Deployment Range</th>
                <th className="p-5 font-black">Current Tracker Status</th>
                <th className="p-5 text-right font-black">Review Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredLeaveRows.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">No active system leave requests tracking this specific criteria.</td></tr>
              ) : (
                filteredLeaveRows.map((row) => {
                  const itemKey = `${row.userId}-${row.leaveIndex}`;
                  return (
                    <tr key={itemKey} className="hover:bg-muted/5 transition-colors">
                      <td className="p-5 font-black uppercase tracking-wide text-foreground">{row.userName}</td>
                      <td className="p-5">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-muted text-muted-foreground tracking-wider border border-border">{row.type}</span>
                      </td>
                      <td className="p-5 font-mono text-muted-foreground">{new Date(row.startDate).toLocaleDateString()} → {new Date(row.endDate).toLocaleDateString()}</td>
                      <td className="p-5">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${row.status === "Approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600 animate-pulse"}`}>{row.status}</span>
                      </td>
                      <td className="p-5 text-right">
                        {row.status === "Pending" ? (
                          <div className="flex justify-end gap-2">
                            <button disabled={!!processingId} onClick={() => handleLeaveDecision(row.userId, row.leaveIndex, "APPROVED")} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><Check size={14} /></button>
                            <button disabled={!!processingId} onClick={() => handleLeaveDecision(row.userId, row.leaveIndex, "REJECTED")} className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><X size={14} /></button>
                          </div>
                        ) : (
                          <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground italic opacity-50">Processed Verified Log</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx global>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { padding: 15px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #64748b; }
        .rbc-event { transition: transform 0.2s; }
        .rbc-event:hover { transform: scale(1.02); }
        .rbc-off-range-bg { background: transparent; opacity: 0.3; }
        .rbc-today { background: hsl(var(--primary) / 0.03); }
      `}</style>
    </div>
  );
}

function LayerToggle({ label, active, onClick, icon, color }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-muted border-border' : 'opacity-40 border-transparent grayscale'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      {active ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} />}
    </button>
  );
}