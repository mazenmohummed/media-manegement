"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
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
  UserCheck
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

  // SINGLE UNIFIED SYNC FUNCTION
  const refreshMasterCalendarData = async () => {
    try {
      // 1. Fetch Master Calendar Logs
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

      // 2. Fetch the custom sub-document embed list array 
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

  // Extract separate structural logs directly from master payload state pipeline arrays
  const productionTasks = useMemo(() => 
    events.filter(e => e.resource?.type === "TASK"), 
    [events]
  );

  const attendanceLogs = useMemo(() => 
    events.filter(e => e.resource?.type === "ATTENDANCE"), 
    [events]
  );

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
    setVisibleLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const eventPropGetter = (event: any) => {
    const colors: any = {
      TASK: event.resource.status === "Completed" ? "#10b981" : "#2563eb",
      ATTENDANCE: "#8b5cf6",
      LEAVE: event.resource.status === "Approved" ? "#f97316" : "#ef4444",
    };
    return {
      style: { backgroundColor: colors[event.resource.type], borderRadius: '6px', fontSize: '10px', border: 'none' }
    };
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
              <LayerToggle 
                label="Production Tasks" 
                active={visibleLayers.includes("TASK")} 
                onClick={() => toggleLayer("TASK")}
                icon={<Briefcase size={14}/>}
                color="bg-blue-600"
              />
              <LayerToggle 
                label="Staff Attendance" 
                active={visibleLayers.includes("ATTENDANCE")} 
                onClick={() => toggleLayer("ATTENDANCE")}
                icon={<Clock size={14}/>}
                color="bg-purple-500"
              />
              <LayerToggle 
                label="Leave Registry" 
                active={visibleLayers.includes("LEAVE")} 
                onClick={() => toggleLayer("LEAVE")}
                icon={<PlaneTakeoff size={14}/>}
                color="bg-orange-500"
              />
            </div>
          </div>

          {/* Live Intelligence Stats */}
          <div className="bg-slate-950 text-white p-6 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Metrics</p>
            <div className="flex justify-between items-center">
              <span className="text-xs opacity-60">Active Tasks</span>
              <span className="font-black text-lg">{productionTasks.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs opacity-60">Staff Checked In</span>
              <span className="font-black text-lg text-purple-400">{attendanceLogs.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs opacity-60">Staff on Leave</span>
              <span className="font-black text-lg text-orange-400">
                {events.filter(e => e.resource.type === "LEAVE" && e.resource.status === "Approved").length}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Interactive Calendar Component Grid Frame */}
      <div className="xl:col-span-3">
        <main className="h-full">
          <div className="bg-card p-8 border border-border rounded-[3rem] shadow-sm min-h-[750px] h-full">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              eventPropGetter={eventPropGetter}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              date={currentDate}
              view={currentView}
              onView={(newView) => setCurrentView(newView)}
              views={['month', 'week', 'day', 'agenda']}
              className="font-sans text-sm custom-calendar"
              popup={true}
              style={{ height: "100%" }}
            />
          </div>
        </main>
      </div>

      {/* PRODUCTION TASKS REGISTRY LOGS DISPLAY BOARD */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4 mt-6">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-2">
          <ListTodo size={18} className="text-blue-600" />
          <div>
            <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Production Tasks Operational Log</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Active tasks pipeline monitoring context records</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5 font-black">
              <tr>
                <th className="p-5 font-black">Task Title / Scope</th>
                <th className="p-5 font-black">Project / Context ID</th>
                <th className="p-5 font-black">Target Schedule Window</th>
                <th className="p-5 font-black">Execution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {productionTasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                    No matching system production tasks verified in current scope array index maps.
                  </td>
                </tr>
              ) : (
                productionTasks.map((task, idx) => (
                  <tr key={idx} className="hover:bg-muted/5 transition-colors">
                    <td className="p-5 font-black uppercase tracking-wide text-foreground">{task.title}</td>
                    <td className="p-5 font-mono text-muted-foreground text-[11px]">
                      {task.resource?.projectId || "N/A"}
                    </td>
                    <td className="p-5 font-mono text-muted-foreground">
                      {task.start.toLocaleDateString()} → {task.end.toLocaleDateString()}
                    </td>
                    <td className="p-5">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                        task.resource?.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {task.resource?.status || "Active Pipeline"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* STAFF ATTENDANCE CHECK-IN LOG BOARD */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-2">
          <UserCheck size={18} className="text-purple-500" />
          <div>
            <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Staff Attendance Ledger</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Real-time daily professional shift timestamp validations</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5 font-black">
              <tr>
                <th className="p-5 font-black">Team Professional</th>
                <th className="p-5 font-black">Timestamp Record Range</th>
                <th className="p-5 font-black">Method Log</th>
                <th className="p-5 font-black">Verification Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                    No attendance punch-card records logged in target system data.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-muted/5 transition-colors">
                    <td className="p-5 font-black uppercase tracking-wide text-foreground">
                      {log.title || "Unknown Professional"}
                    </td>
                    <td className="p-5 font-mono text-muted-foreground">
                      {log.start.toLocaleString()}
                    </td>
                    <td className="p-5">
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-muted text-muted-foreground tracking-wider border border-border">
                        {log.resource?.method || "System Sync Portal"}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest bg-purple-500/10 text-purple-600">
                        {log.resource?.status || "Verified Shift Log"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DEDICATED ADMIN LEAVE MANAGEMENT CONTROLS DASHBOARD PANEL */}
      <section className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm xl:col-span-4">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-2">
          <PlaneTakeoff size={18} className="text-orange-500" />
          <div>
            <h3 className="font-black text-foreground text-sm uppercase tracking-wider">Leave Operations Review Board</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Pending internal corporate time-off pipeline analysis</p>
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
              {pendingLeaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                    No active system leave requests requiring profile resolution at this time frame window.
                  </td>
                </tr>
              ) : (
                pendingLeaves.map((row) => {
                  const itemKey = `${row.userId}-${row.leaveIndex}`;
                  return (
                    <tr key={itemKey} className="hover:bg-muted/5 transition-colors">
                      <td className="p-5 font-black uppercase tracking-wide text-foreground">{row.userName}</td>
                      <td className="p-5">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-muted text-muted-foreground tracking-wider border border-border">
                          {row.type}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-muted-foreground">
                        {new Date(row.startDate).toLocaleDateString()} → {new Date(row.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-5">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                          row.status === "Approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600 animate-pulse"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        {row.status === "Pending" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={!!processingId}
                              onClick={() => handleLeaveDecision(row.userId, row.leaveIndex, "APPROVED")}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              disabled={!!processingId}
                              onClick={() => handleLeaveDecision(row.userId, row.leaveIndex, "REJECTED")}
                              className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground italic opacity-50">
                            Processed Verified Log
                          </span>
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
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
        active ? 'bg-muted border-border' : 'opacity-40 border-transparent grayscale'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      {active ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} />}
    </button>
  );
}