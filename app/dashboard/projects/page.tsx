"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  TrendingUp,
  DollarSign,
  PieChart,
  Layers
} from "lucide-react";

type ProjectWithRelations = any;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterMode, setFilterMode] = useState<"PRESET" | "MONTH" | "CUSTOM">("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProjects(data || []); 
      } catch (error) {
        console.error("Failed to load projects", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);
 // --- CALCULATIONS & FILTERING ---
  const { filteredProjects, stats } = useMemo(() => {
    // 1. Filter and Map projects to include pre-calculated row totals
    const filtered = projects
      .filter((project) => {
        const projectDate = new Date(project.createdAt);
        const matchesSearch = 
          project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.client?.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (filterMode === "MONTH") return projectDate.getMonth() === parseInt(selectedMonth);
        if (filterMode === "CUSTOM" && dateRange.start && dateRange.end) {
          return projectDate >= new Date(dateRange.start) && projectDate <= new Date(dateRange.end);
        }
        if (filterMode === "PRESET") {
          if (activePreset === "ALL") return true;
          const month = projectDate.getMonth();
          if (activePreset === "Q1") return month >= 0 && month <= 2;
          if (activePreset === "Q2") return month >= 3 && month <= 5;
        }
        return true;
      })
      .map((project) => {
          const tasks = project.tasks ?? [];
          const taskCount = tasks.length;

          // 1. Calculate Average Progress (%)
          const totalTaskProgress = tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0);
          const avgProgress = taskCount > 0 ? Math.round(totalTaskProgress / taskCount) : 0;

          // 2. Determine Overall Status
          // If there are tasks and all of them are "COMPLETED", the project is COMPLETED.
          // Otherwise, if there's at least one task, it's ACTIVE.
          const allTasksDone = taskCount > 0 && tasks.every((t: any) => t.status === "COMPLETED");
          const derivedStatus = allTasksDone ? "COMPLETED" : "ACTIVE";

          // 3. Calculate Profit (Existing logic)
          const calculatedNetProfit = tasks.reduce(
            (sum: number, t: any) => sum + (t.taskNetProfit || 0), 
            0
          );

          return { 
            ...project, 
            calculatedNetProfit, 
            avgProgress, 
            derivedStatus 
          };
        });

    // 2. Calculate global totals for the StatCards
    const totals = filtered.reduce((acc, project) => {
      return {
        totalRevenue: acc.totalRevenue + (project.totalValue || 0),
        totalProfit: acc.totalProfit + project.calculatedNetProfit, // Using the pre-calculated value
        totalTasks: acc.totalTasks + (project.tasks?.length || 0)
      };
    }, { totalRevenue: 0, totalProfit: 0, totalTasks: 0 });

    return { filteredProjects: filtered, stats: totals };
  }, [projects, searchQuery, filterMode, activePreset, selectedMonth, dateRange]);

  if (loading) return <div className="p-20 text-center font-black uppercase italic animate-pulse text-muted-foreground">Accessing Ledger...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-background min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Command Center: Projects</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Active Deployments & Financial Tracking</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-card border rounded-xl overflow-hidden p-1 shadow-sm">
            {["PRESET", "MONTH", "CUSTOM"].map((mode) => (
              <button 
                key={mode}
                onClick={() => setFilterMode(mode as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                  filterMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Link href="/dashboard/projects/new" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">
            <PlusCircle size={16} /> New Deployment
          </Link>
        </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Pipeline" value={`${filteredProjects.length} Entities`} icon={<Layers size={14} />} />
        <StatCard label="total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={14} />} color="blue" />
        <StatCard label="Gross Revenue" value={`$${stats.totalProfit.toLocaleString()}`} icon={<TrendingUp size={14} />} color="emerald" />
        <StatCard label="Avg Margin" value={`${stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%`} icon={<PieChart size={14} />} color="purple" />
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-card border p-6 rounded-[2.5rem] space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-background border px-4 py-2.5 rounded-xl w-full max-w-md focus-within:ring-2 ring-blue-500/20 transition-all">
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

      {/* LEDGER TABLE */}
      <div className="bg-card border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/30">
                <th className="px-8 py-5">Project / Story</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Completion Status</th>
                <th className="px-8 py-5">Financials</th>
                <th className="px-8 py-5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y border-t">
            {filteredProjects.map((project) => {
              // 1. Calculate the total profit for THIS specific project row
              const projectProfit = (project.tasks ?? []).reduce((pAcc: number, t: any) => {
                return pAcc + (t.taskNetProfit || 0);
              }, 0);

              return (
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
                  
               
                  {/* --- PROGRESS COLUMN --- */}
                  <td className="px-8 py-6">
                    <div className="w-full max-w-[140px] space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                        <span className={project.derivedStatus === "COMPLETED" ? "text-emerald-600" : "text-blue-600"}>
                            {project.derivedStatus === "COMPLETED" ? "Deployment Complete" : "Active Deployment"}
                        </span>
                        <span className="text-foreground">{project.avgProgress}%</span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            project.derivedStatus === "COMPLETED" ? "bg-emerald-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${project.avgProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* --- FINANCIALS UI FIXED --- */}
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-sm tracking-tight">
                        {/* Optional chaining added for safety */}
                        ${(project.totalValue || 0).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <TrendingUp size={10} />
                        {/* Use the calculated variable projectProfit here */}
                        <span>${(project.calculatedNetProfit || 0).toLocaleString()} Net</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-6 text-right">
                    <p className="font-black italic text-lg tracking-tighter">
                      ${(project.totalValue || 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">{project.invoiceStatus}</p>
                  </td>
                </tr>
              );
            })}
</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-component for clean stats
function StatCard({ label, value, icon, color = "gray" }: any) {
  const colors: any = {
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-600",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-600",
    gray: "text-muted-foreground"
  };

  return (
    <div className={`bg-card border p-6 rounded-[2rem] ${colors[color] || ""}`}>
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        <div className="opacity-70">{icon}</div>
      </div>
      <p className="text-3xl font-black italic mt-1 text-foreground">{value}</p>
    </div>
  );
}