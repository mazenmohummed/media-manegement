"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useRouter } from "next/navigation";

const localizer = momentLocalizer(moment);
const CATEGORIES = ["CONSULTATION", "VIDEO", "DESIGN", "PHOTO", "REALS"];
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

export default function TaskManagementPage() {
    const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyId] = useState("cmn54lzs80000xmuszsm3i9z3");

  // --- FILTERS STATE ---
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generalSearch, setGeneralSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

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
      setTasks(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  // Sync Calendar view when month/preset changes
  useEffect(() => {
    if (filterMode === "MONTH") {
      const newDate = new Date();
      newDate.setMonth(parseInt(selectedMonth));
      setDate(newDate);
    }
  }, [selectedMonth, filterMode]);

  const updateTaskStatus = async (id: string, status: string, progress: number) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ id, status, progress })
      });
      if (res.ok) fetchTasks(); 
    } catch (err) { console.error(err); }
  };

  // --- FILTER ENGINE ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Category Filter (Case-Insensitive)
      const taskCat = task.taskType?.toUpperCase();
      const catMatch = selectedCats.length === 0 || selectedCats.includes(taskCat);
      
      // 2. Search Filter
      const searchLower = generalSearch.toLowerCase();
      const searchMatch = generalSearch === "" || 
        task.project?.projectName?.toLowerCase().includes(searchLower) || 
        task.taskType?.toLowerCase().includes(searchLower) ||
        task.assignee?.name?.toLowerCase().includes(searchLower);

      // 3. Time Filter Logic
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
      id: task.id,
      title: `[${task.status}] ${task.project?.projectName || 'No Project'} - ${task.taskType}`,
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      resource: task,
    }));
  }, [filteredTasks]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">SYNCING PRODUCTION NODES...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 bg-background min-h-screen">
      {/* HEADER & SEARCH */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic underline decoration-blue-600 decoration-4">Production Control</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Live Agency Workflow</p>
        </div>
        <input 
          type="text" 
          placeholder="Search Nodes..." 
          className="bg-card border-2 border-blue-500/20 rounded-2xl px-5 py-3 text-xs font-bold uppercase outline-none focus:border-blue-500 w-full md:w-80"
          value={generalSearch}
          onChange={(e) => setGeneralSearch(e.target.value)}
        />
      </header>

      {/* NEW ADVANCED FILTER SECTION */}
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
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCats.includes(cat) ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-background border-border text-muted-foreground hover:border-foreground"}`}>
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
            <th className="p-6">Priority</th> {/* NEW COLUMN */}
            <th className="p-6">Progress</th> {/* NEW COLUMN */}
            <th className="p-6">Status</th>
            <th className="p-6">Last Update</th>
            <th className="p-6">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredTasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-20 text-center text-muted-foreground font-black uppercase text-[10px]">
                No Nodes matching current filters
              </td>
            </tr>
          ) : (
            filteredTasks.map((task) => (
              <tr 
                key={task.id} 
                onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                className="hover:bg-muted/10 transition-colors group cursor-pointer"
              >
                {/* 1. TASK NODE */}
                <td className="p-6">
                  <div className="font-bold text-sm">{task.taskType}</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase">
                    {task.project?.projectName}
                  </div>
                </td>

                {/* 2. PRIORITY (NEW) */}
                <td className="p-6">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                    task.priority === 'URGENT' 
                      ? "bg-red-50 text-red-600 border-red-200" 
                      : task.priority === 'HIGH'
                      ? "bg-orange-50 text-orange-600 border-orange-200"
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  }`}>
                    {task.priority || 'MEDIUM'}
                  </span>
                </td>

                {/* 3. PROGRESS (NEW) */}
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-[80px] bg-muted h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          task.progress === 100 ? "bg-emerald-500" : "bg-foreground"
                        }`} 
                        style={{ width: `${task.progress}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-black w-8">{task.progress}%</span>
                  </div>
                </td>

                {/* 4. STATUS */}
                <td className="p-6">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                    task.status === 'COMPLETED' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {task.status}
                  </span>
                </td>

                {/* 5. LAST UPDATE */}
                <td className="p-6">
                  <div className="text-[10px] font-bold text-foreground uppercase tracking-tight">
                    {task.lastUpdateTimestamp 
                      ? moment(task.lastUpdateTimestamp).format("MMM DD, YYYY") 
                      : "NO HISTORY"}
                  </div>
                  <div className="text-[8px] text-muted-foreground font-medium">
                    {task.lastUpdateTimestamp && moment(task.lastUpdateTimestamp).format("hh:mm A")}
                  </div>
                </td>

                {/* 6. ASSIGNEE */}
                <td className="p-6 text-sm font-bold text-blue-600">
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {task.assignees.map((user: any) => (
                        <span key={user.id} className="block">
                          {user.name || "Unknown User"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic font-medium">UNASSIGNED</span>
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
            min={new Date(0, 0, 0, 8, 0, 0)}
            max={new Date(0, 0, 0, 20, 0, 0)}
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
            onSelectEvent={(event) => setSelectedTask(event.resource)}
          />
        </div>
      </div>
    </div>
  );
}