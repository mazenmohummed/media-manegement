"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  Filter as FilterIcon, 
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar
} from "lucide-react";

// Types derived from your structure
type ProjectWithRelations = any; // Replace with your generated Prisma types if available

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- FILTER STATES ---
  const [filterMode, setFilterMode] = useState<"PRESET" | "MONTH" | "CUSTOM">("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Initial Fetch
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects'); // Ensure you have this endpoint
        const data = await res.json();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects", error);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const projectDate = new Date(project.createdAt);
      
      // 1. Search Filter
      const matchesSearch = project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            project.client?.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Date Filter
      if (filterMode === "MONTH") {
        return projectDate.getMonth() === parseInt(selectedMonth);
      }
      
      if (filterMode === "CUSTOM" && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return projectDate >= start && projectDate <= end;
      }
      
      if (filterMode === "PRESET") {
        if (activePreset === "ALL") return true;
        const month = projectDate.getMonth();
        if (activePreset === "Q1") return month >= 0 && month <= 2;
        if (activePreset === "Q2") return month >= 3 && month <= 5;
      }
      
      return true;
    });
  }, [projects, searchQuery, filterMode, activePreset, selectedMonth, dateRange]);

  const stats = {
    totalValue: filteredProjects.reduce((acc, p) => acc + (p.totalValue || 0), 0),
    taskCount: filteredProjects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0)
  };

  if (loading) return <div className="p-20 text-center font-black uppercase italic animate-pulse">Accessing Ledger...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Command Center: Projects</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Active Deployments & Financial Tracking</p>
        </div>
        <div className="flex gap-3">
            <div className="flex bg-card border rounded-xl overflow-hidden p-1">
                {["PRESET", "MONTH", "CUSTOM"].map((mode) => (
                    <button 
                        key={mode}
                        onClick={() => setFilterMode(mode as any)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                            filterMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
            <Link href="/dashboard/projects/new" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                <PlusCircle size={16} /> New Deployment
            </Link>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-card border p-6 rounded-[2.5rem] space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-background border px-4 py-2.5 rounded-xl w-full max-w-md">
                <Search size={14} className="text-muted-foreground" />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Projects or Clients..." 
                    className="bg-transparent border-none outline-none text-xs font-bold uppercase w-full"
                />
            </div>

            <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Timeline Selection:</h2>
                {filterMode === "PRESET" && (
                    <select value={activePreset} onChange={(e) => setActivePreset(e.target.value)}
                        className="bg-background border border-border px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 cursor-pointer">
                        <option value="ALL">All Recorded Time</option>
                        <option value="Q1">Q1 (Jan — Mar)</option>
                        <option value="Q2">Q2 (Apr — Jun)</option>
                    </select>
                )}
                {filterMode === "MONTH" && (
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-background border border-border px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 cursor-pointer">
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                        ))}
                    </select>
                )}
                {filterMode === "CUSTOM" && (
                    <div className="flex items-center gap-3">
                        <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-muted-foreground text-[10px] font-black tracking-widest">TO</span>
                        <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* STATS SUMMARY (Linked to filtered data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filtered Pipeline</p>
          <p className="text-3xl font-black italic">{filteredProjects.length} Entities</p>
        </div>
        <div className="bg-card border p-6 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Filtered Revenue</p>
          <p className="text-3xl font-black italic text-emerald-600">${stats.totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-card border p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scope Units</p>
          <p className="text-3xl font-black italic">{stats.taskCount} Units</p>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-card border rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/30">
                <th className="px-8 py-5">Project / Story</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Workflow</th>
                <th className="px-8 py-5 text-right">Invoice Value</th>
              </tr>
            </thead>
            <tbody className="divide-y border-t">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-8 py-6">
                    <Link href={`/dashboard/projects/${project.id}`}>
                        <span className="font-black text-sm uppercase tracking-tight group-hover:text-blue-600 block">
                          {project.projectName}
                        </span>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 italic">
                          {project.projectStory || "No mission brief provided."}
                        </p>
                    </Link>
                  </td>
                  <td className="px-8 py-6 uppercase font-bold text-xs">{project.client?.clientName}</td>
                  <td className="px-8 py-6">
                    <div className="flex -space-x-2">
                        {project.tasks?.map((task: any) => (
                            <div key={task.id} title={task.taskType} className="w-7 h-7 rounded-full border-2 border-background bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-600 uppercase">
                                {task.taskType.charAt(0)}
                            </div>
                        ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-black italic text-lg tracking-tighter">${project.totalValue?.toLocaleString()}</p>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">{project.invoiceStatus}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProjects.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Zero records found for current selection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}