"use client";

import React, { useState, useMemo } from "react";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// --- TYPES (Aligned with Filter Engine) ---
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

interface ServiceDetail {
  id: string;
  employee: string;
  startDate: string;
  endDate: string;
  lastUpdate: string;
  status: "Pending" | "In Progress" | "Paused" | "Review" | "Completed";
  progress: number;
  projectName: string;
  serviceName: string;
  description?: string;
  tools?: string[];
}

const localizer = momentLocalizer(moment);

// Categories for the filter engine
const CATEGORIES = ["Reals", "Photo", "Design", "Video", "Consultation"];

export default function TaskManagementPage() {
  // --- STATE: DATA ---
  const [tasks, setTasks] = useState<ServiceDetail[]>([
    {
      id: "1",
      projectName: "Summer Campaign",
      serviceName: "Reals",
      employee: "Ahmed",
      startDate: "2026-02-01",
      endDate: "2026-02-10",
      lastUpdate: "2026-02-09",
      status: "In Progress",
      progress: 65,
      description: "Editing high-energy vertical video for social launch.",
      tools: ["Premiere Pro", "CapCut"]
    },
    {
      id: "2",
      projectName: "Nike Launch",
      serviceName: "Photo",
      employee: "Ali",
      startDate: "2026-02-05",
      endDate: "2026-02-12",
      status: "Paused",
      lastUpdate: "2026-02-09",
      progress: 20,
      description: "Product photography for the new Air Max line.",
      tools: ["Lightroom", "Capture One"]
    }
  ]);

  // --- STATE: FILTERS ---
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("1"); // Feb is index 1
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generalSearch, setGeneralSearch] = useState("");

  const [selectedTask, setSelectedTask] = useState<ServiceDetail | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 22));
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);

  // --- FILTER ENGINE LOGIC ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Service Category Match
      const catMatch = selectedCats.length === 0 || selectedCats.includes(task.serviceName);
      
      // 2. Time Match
      const taskStart = new Date(task.startDate);
      let timeMatch = true;
      if (filterMode === "PRESET") {
        if (activePreset === "Q1") timeMatch = taskStart.getMonth() <= 2;
        if (activePreset === "Q2") timeMatch = taskStart.getMonth() >= 3 && taskStart.getMonth() <= 5;
      } else if (filterMode === "MONTH") {
        timeMatch = taskStart.getMonth() === parseInt(selectedMonth);
      } else if (filterMode === "CUSTOM") {
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        if (start && taskStart < start) timeMatch = false;
        if (end && taskStart > end) timeMatch = false;
      }

      // 3. Search Match
      const searchLower = generalSearch.toLowerCase();
      const searchMatch = generalSearch === "" || 
        task.projectName.toLowerCase().includes(searchLower) || 
        task.serviceName.toLowerCase().includes(searchLower) ||
        task.employee.toLowerCase().includes(searchLower);

      return catMatch && timeMatch && searchMatch;
    });
  }, [tasks, selectedCats, filterMode, activePreset, selectedMonth, dateRange, generalSearch]);

  const combinedEvents = useMemo(() => {
    return filteredTasks.map(task => ({
      title: `[${task.status}] ${task.serviceName}`,
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      resource: task,
    }));
  }, [filteredTasks]);

  // --- CORE ACTIONS ---
  const updateStatus = (id: string, status: ServiceDetail["status"]) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      let progress = t.progress;
      if (status === "Completed") progress = 100;
      if (status === "Review") progress = Math.max(progress, 85);
      if (status === "In Progress" && progress === 0) progress = 10;
      return { ...t, status, progress };
    }));
  };

  const updateTaskDetails = (updatedTask: ServiceDetail) => {
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
  };

  const deleteTask = (id: string) => {
    if(confirm("Are you sure you want to terminate this task?")) {
        setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 bg-background min-h-screen relative overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic underline decoration-blue-600 decoration-4">Production Control</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">
            Task Lifecycle Management
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
            <input 
                type="text" 
                placeholder="Search Project, Employee, Task..." 
                className="w-full bg-card border-2 border-blue-500/20 rounded-2xl px-5 py-3 text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all shadow-sm"
                value={generalSearch}
                onChange={(e) => setGeneralSearch(e.target.value)}
            />
        </div>
      </header>

      {/* FILTER ENGINE SECTION */}
      <div className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Service Departments</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCats.includes(cat) ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-background border-border text-muted-foreground hover:border-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

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
      </div>

      {/* TASK MANAGEMENT TABLE */}
      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b border-border">
            <tr>
              <th className="p-6 tracking-widest">Task Details</th>
              <th className="p-6 tracking-widest">Current Status</th>
              <th className="p-6 tracking-widest">Workflow Actions</th>
              <th className="p-6 tracking-widest">Last update</th>
              <th className="p-6 tracking-widest text-right">Removal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <tr 
                key={task.id} 
                className="hover:bg-muted/5 transition-colors group cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <td className="p-6">
                  <div className="font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">{task.serviceName}</div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    {task.projectName} • <span className="text-blue-500">{task.employee}</span>
                  </div>
                </td>
                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                      task.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      task.status === "Paused" ? "bg-slate-100 text-slate-600 border-slate-200" :
                      task.status === "Review" ? "bg-purple-50 text-purple-700 border-purple-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {task.status}
                    </span>
                    <div className="w-24 bg-muted h-1 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${task.status === 'Paused' ? 'bg-slate-400' : 'bg-foreground'}`} style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                </td>
                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStatus(task.id, "Paused")} className="p-2 rounded-lg border border-border hover:bg-slate-100 transition-all">⏸️</button>
                    <button onClick={() => updateStatus(task.id, "In Progress")} className="px-3 py-2 bg-muted hover:bg-blue-50 hover:text-blue-600 rounded-lg text-[9px] font-black uppercase transition-all">Start</button>
                    <button onClick={() => updateStatus(task.id, "Review")} className="px-3 py-2 bg-muted hover:bg-purple-50 hover:text-purple-600 rounded-lg text-[9px] font-black uppercase transition-all">Review</button>
                    <button onClick={() => updateStatus(task.id, "Completed")} className="px-3 py-2 bg-muted hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-[9px] font-black uppercase transition-all">Done</button>
                  </div>
                </td>
                 <td className="p-6 text-left" onClick={(e) => e.stopPropagation()}>
                  <div className="font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">{task.lastUpdate}</div>
                </td>
                <td className="p-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="p-20 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">
            Zero production nodes match current filter
          </div>
        )}
      </div>

      {/* CALENDAR SECTION */}
      <div className="bg-card p-8 border border-border rounded-[2.5rem] shadow-sm">
        <div className="h-[600px] text-sm custom-calendar-wrapper">
          <Calendar
            localizer={localizer}
            events={combinedEvents}
            date={currentDate}
            onNavigate={d => setCurrentDate(d)}
            view={currentView}
            onView={v => setCurrentView(v)}
            onSelectEvent={(e: any) => setSelectedTask(e.resource)}
            eventPropGetter={(event: any) => ({
                style: {
                    backgroundColor: event.resource.status === 'Completed' ? '#10b981' : '#2563eb',
                    borderRadius: '8px', border: 'none', fontSize: '10px', fontWeight: '800'
                }
            })}
          />
        </div>
      </div>

      {/* --- TASK DETAILS SLIDE-OVER --- */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelectedTask(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Production Node Details</span>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-muted rounded-full">✕</button>
            </div>

            <div className="space-y-8">
              <section>
                <input 
                  className="text-2xl font-black uppercase tracking-tighter bg-transparent w-full outline-none focus:text-blue-600 transition-colors"
                  value={selectedTask.serviceName}
                  onChange={(e) => updateTaskDetails({...selectedTask, serviceName: e.target.value})}
                />
                <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-tight">{selectedTask.projectName} • Assigned to {selectedTask.employee}</p>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Start Node</label>
                  <input type="date" className="w-full bg-muted p-3 rounded-xl text-xs font-bold" value={selectedTask.startDate} onChange={(e) => updateTaskDetails({...selectedTask, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Deadline</label>
                  <input type="date" className="w-full bg-muted p-3 rounded-xl text-xs font-bold" value={selectedTask.endDate} onChange={(e) => updateTaskDetails({...selectedTask, endDate: e.target.value})} />
                </div>
              </section>

              <section className="space-y-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Brief / Description</label>
                <textarea 
                  className="w-full bg-muted p-4 rounded-2xl text-sm min-h-[120px] outline-none focus:ring-2 ring-blue-500/20"
                  placeholder="Add task instructions here..."
                  value={selectedTask.description || ""}
                  onChange={(e) => updateTaskDetails({...selectedTask, description: e.target.value})}
                />
              </section>

              <div className="pt-10 flex flex-col gap-3">
                <button onClick={() => updateStatus(selectedTask.id, "Completed")} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Execute Completion</button>
                <button onClick={() => setSelectedTask(null)} className="w-full bg-muted text-foreground py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Return to Dashboard</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STYLES */}
      <style jsx global>{`
        .custom-calendar-wrapper .rbc-toolbar { margin-bottom: 2rem; display: flex; justify-content: space-between; }
        .custom-calendar-wrapper .rbc-btn-group { background: #f4f4f5; padding: 4px; border-radius: 12px; }
        .custom-calendar-wrapper .rbc-toolbar button { border: none !important; font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; padding: 6px 16px !important; border-radius: 8px !important; cursor: pointer; }
        .custom-calendar-wrapper .rbc-toolbar button.rbc-active { background: white !important; box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-in { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}