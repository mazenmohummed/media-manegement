"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useRouter } from "next/navigation";

const localizer = momentLocalizer(moment);
// Matching your exact capital-case data model formats
const CATEGORIES = ["Consultation", "Video", "Design", "Photo", "Reals"];
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

export default function TaskManagementPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Updated to match your active MongoDB record group parameter layout
  const [agencyId] = useState("cmqv7pkzo0000xmkk0u7229sf");

  // --- FILTERS STATE ---
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generalSearch, setGeneralSearch] = useState("");

  // --- CALENDAR SPECIFIC STATE ---
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // --- HANDLERS ---
  const handleNavigate = (newDate: Date) => setDate(newDate);
  const handleViewChange = (newView: any) => setView(newView);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?agencyId=${agencyId}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setTasks(data);
      } else if (data && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else if (data && Array.isArray(data.data)) {
        setTasks(data.data);
      } else {
        console.warn("Received structured data wrapping object payload:", data);
        setTasks([]);
      }
    } catch (err) { 
      console.error("Failed to query production node registers:", err); 
      setTasks([]);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchTasks(); 
  }, [agencyId]);

  useEffect(() => {
    if (filterMode === "MONTH") {
      const newDate = new Date();
      newDate.setMonth(parseInt(selectedMonth));
      setDate(newDate);
    }
  }, [selectedMonth, filterMode]);

  // --- FILTER ENGINE ---
  const filteredTasks = useMemo(() => {
    const reliableTasksArray = Array.isArray(tasks) ? tasks : [];

    return reliableTasksArray.filter(task => {
      // 1. Normalized Case-Insensitive Category Filter
      const taskCat = task.taskType?.trim().toUpperCase();
      const catMatch = selectedCats.length === 0 || 
        selectedCats.some(c => c.toUpperCase() === taskCat);
      
      // 2. Search Filter matching task fields safely
      const searchLower = generalSearch.toLowerCase().trim();
      const searchMatch = searchLower === "" || 
        task.project?.projectName?.toLowerCase().includes(searchLower) || 
        task.taskType?.toLowerCase().includes(searchLower) ||
        task.taskNo?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower);

      // 3. Time Filter Logic
      if (!task.startDate) return catMatch && searchMatch;
      const taskDate = new Date(task.startDate);
      let timeMatch = true;

      if (filterMode === "PRESET") {
        const month = taskDate.getMonth();
        if (activePreset === "Q1") timeMatch = month >= 0 && month <= 2;
        else if (activePreset === "Q2") timeMatch = month >= 3 && month <= 5;
        else if (activePreset === "ALL") timeMatch = true;
      } 
      else if (filterMode === "MONTH") {
        timeMatch = taskDate.getMonth() === parseInt(selectedMonth);
      } 
      else if (filterMode === "CUSTOM") {
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        if (start) timeMatch = timeMatch && taskDate >= start;
        if (end) timeMatch = timeMatch && taskDate <= end;
      }

      return catMatch && searchMatch && timeMatch;
    });
  }, [tasks, selectedCats, generalSearch, filterMode, activePreset, selectedMonth, dateRange]);

  const combinedEvents = useMemo(() => {
    return filteredTasks.map(task => ({
      id: task.id || task._id,
      title: `[${task.taskNo || "TASK"}] ${task.taskType}`,
      start: new Date(task.startDate),
      end: task.endDate ? new Date(task.endDate) : new Date(task.startDate),
      resource: task,
    }));
  }, [filteredTasks]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-xs tracking-widest">SYNCING PRODUCTION NODES...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 bg-background min-h-screen text-foreground">
      {/* HEADER & SEARCH */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic underline decoration-blue-600 decoration-4">Production Control</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Live Agency Workflow</p>
        </div>
        <input 
          type="text" 
          placeholder="Search Nodes..." 
          className="bg-card border-2 border-border rounded-2xl px-5 py-3 text-xs font-bold uppercase outline-none focus:border-blue-500 w-full md:w-80"
          value={generalSearch}
          onChange={(e) => setGeneralSearch(e.target.value)}
        />
      </header>

      {/* ADVANCED FILTER SECTION */}
      <div className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filter Mode</h2>
            <div className="flex bg-muted p-1 rounded-xl border border-border w-fit">
              {(["PRESET", "MONTH", "CUSTOM"] as FilterMode[]).map((mode) => (
                <button key={mode} onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Selection</h2>
            <div className="flex flex-wrap items-center gap-4">
              {filterMode === "PRESET" && (
                <select value={activePreset} onChange={(e) => setActivePreset(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer">
                  <option value="ALL">All Recorded Time</option>
                  <option value="Q1">Q1 (Jan — Mar)</option>
                  <option value="Q2">Q2 (Apr — Jun)</option>
                </select>
              )}
              {filterMode === "MONTH" && (
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              )}
              {filterMode === "CUSTOM" && (
                <div className="flex items-center gap-3">
                  <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                  <span className="text-muted-foreground text-[10px] font-black tracking-widest">TO</span>
                  <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY CHIPS & RESET */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCats.includes(cat) ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-card border-border text-muted-foreground hover:border-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase bg-muted px-3 py-1 rounded-full">
            {filteredTasks.length} Nodes Active
          </span>
          <button onClick={() => { setSelectedCats([]); setGeneralSearch(""); setActivePreset("ALL"); setDateRange({start:"", end:""}); }} className="text-[10px] font-black uppercase text-red-500 hover:underline">Reset System ×</button>
        </div>
      </div>

      {/* TASKS TABLE */}
      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b border-border">
            <tr>
              <th className="p-6">Task Node</th>
              <th className="p-6">Priority</th>
              <th className="p-6">Progress</th>
              <th className="p-6">Status</th>
              <th className="p-6">Timeline context</th>
              <th className="p-6">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-20 text-center text-muted-foreground font-black uppercase text-[10px]">
                  No Nodes matching current workspace filters
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr 
                  key={task.id || task._id} 
                  onClick={() => router.push(`/dashboard/tasks/${task.id || task._id}`)}
                  className="hover:bg-muted/10 transition-colors group cursor-pointer"
                >
                  {/* 1. TASK NODE */}
                  <td className="p-6">
                    <div className="font-bold text-sm text-foreground">{task.taskType}</div>
                    <div className="text-[9px] text-blue-600 font-mono font-bold uppercase tracking-tight">
                      {task.taskNo || "NO ID"} {task.project?.projectName ? `| ${task.project.projectName}` : ""}
                    </div>
                  </td>

                  {/* 2. PRIORITY */}
                  <td className="p-6">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                      task.priority === 'URGENT' || task.priority === 'HIGH'
                        ? "bg-red-500/10 text-red-500 border-red-500/20" 
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}>
                      {task.priority || 'MEDIUM'}
                    </span>
                  </td>

                  {/* 3. PROGRESS */}
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[80px] bg-muted h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            task.progress === 100 ? "bg-emerald-500" : "bg-blue-600"
                          }`} 
                          style={{ width: `${task.progress || 0}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-black w-8">{task.progress || 0}%</span>
                    </div>
                  </td>

                  {/* 4. STATUS */}
                  <td className="p-6">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                      task.status === 'COMPLETED' 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}>
                      {task.status}
                    </span>
                  </td>

                  {/* 5. TIMELINE CONTEXT */}
                  <td className="p-6">
                    <div className="text-[10px] font-bold uppercase tracking-tight">
                      {task.startDate ? moment(task.startDate).format("MMM DD, YYYY") : "NO DATE"}
                    </div>
                    <div className="text-[8px] text-muted-foreground font-medium">
                      {task.startDate && moment(task.startDate).format("hh:mm A")}
                    </div>
                  </td>

                  {/* 6. ASSIGNEES RELATION */}
                  <td className="p-6 text-xs font-bold text-foreground">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {task.assignees.map((user: any) => (
                          <span key={user.id || user._id} className="block text-blue-600">
                            {user.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px] italic font-medium">UNASSIGNED</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CALENDAR */}
      <div className="bg-card p-8 border border-border rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="h-[700px] text-sm custom-calendar-wrapper">
          <Calendar
            localizer={localizer}
            events={combinedEvents}
            view={view}
            date={date}
            onView={handleViewChange}
            onNavigate={handleNavigate}
            views={['month', 'week', 'day', 'agenda']}
            step={60}
            timeslots={1}
            eventPropGetter={(event: any) => ({
              style: {
                backgroundColor: event.resource.status === 'COMPLETED' ? '#10b981' : '#2563eb',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 5px'
              }
            })}
          />
        </div>
      </div>
    </div>
  );
}