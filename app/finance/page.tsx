"use client";

import Link from "next/link";
import React, { useState, useMemo } from "react";

// --- INTERFACES ---
interface ServiceDetail {
  employee: string;
  isFreelancer: boolean;
  salary: string;
}

interface Project {
  id: number;
  projectName: string;
  clientName: string;
  budget: number;
  type: "retainer" | "one-off";
  date: string;
  services: Record<string, ServiceDetail>;
}

interface InternalEmployee {
  id: number;
  name: string;
  role: string;
  monthlySalary: number;
}

// Filter Types
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

export default function FinancePage() {
  // --- FILTER STATE ---
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // --- DATA ---
  const [projects] = useState<Project[]>([
    {
      id: 1,
      projectName: "Summer Campaign",
      clientName: "Nike",
      budget: 5000,
      type: "one-off",
      date: "2024-02-15",
      services: {
        "Reals": { employee: "John Doe", isFreelancer: true, salary: "1200" },
        "Design": { employee: "Sarah Staff", isFreelancer: false, salary: "0" },
      }
    },
    {
      id: 2,
      projectName: "Monthly Content",
      clientName: "Coca Cola",
      budget: 3500,
      type: "retainer",
      date: "2024-01-10",
      services: {
        "Photo": { employee: "Mike Ross", isFreelancer: true, salary: "900" }
      }
    },
    {
      id: 3,
      projectName: "Brand Refresh",
      clientName: "Local Shop",
      budget: 2000,
      type: "one-off",
      date: "2023-12-05",
      services: {
        "Design": { employee: "Sarah Jenkins", isFreelancer: false, salary: "0" }
      }
    }
  ]);

  const [employees] = useState<InternalEmployee[]>([
    { id: 1, name: "Sarah Jenkins", role: "Lead Designer", monthlySalary: 4500 },
  ]);

  // --- REFINED FILTER LOGIC ---
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const pDate = new Date(p.date);
      const pMonth = pDate.getMonth();

      if (filterMode === "PRESET") {
        if (activePreset === "ALL") return true;
        if (activePreset === "Q1") return pMonth >= 0 && pMonth <= 2;
        if (activePreset === "Q2") return pMonth >= 3 && pMonth <= 5;
      }

      if (filterMode === "MONTH") {
        return pMonth === parseInt(selectedMonth);
      }

      if (filterMode === "CUSTOM") {
        if (!dateRange.start || !dateRange.end) return true;
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return pDate >= start && pDate <= end;
      }

      return true;
    });
  }, [filterMode, activePreset, selectedMonth, dateRange, projects]);

  // --- CALCULATIONS (Based on Filtered Data) ---
  const totalProjectRevenue = filteredProjects.reduce((sum, p) => sum + p.budget, 0);
  
  const retainerRevenue = filteredProjects
    .filter(p => p.type === "retainer")
    .reduce((sum, p) => sum + p.budget, 0);

  const oneOffRevenue = filteredProjects
    .filter(p => p.type === "one-off")
    .reduce((sum, p) => sum + p.budget, 0);

  const totalFreelanceExpenses = filteredProjects.flatMap(p => Object.values(p.services))
    .filter(d => d.isFreelancer)
    .reduce((sum, d) => sum + Number(d.salary), 0);
    
  const totalEmployeePayroll = filteredProjects.length > 0 ? employees.reduce((sum, e) => sum + e.monthlySalary, 0) : 0;
  
  const totalCosts = totalFreelanceExpenses + totalEmployeePayroll;
  const netProfit = totalProjectRevenue - totalCosts;
  const profitMargin = totalProjectRevenue > 0 ? (netProfit / totalProjectRevenue) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Financial Hub</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Advanced Filtering Enabled</p>
        </div>

        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Tax Reserve (20%)</p>
          <p className="text-xl font-black text-orange-600 font-mono">${(totalProjectRevenue * 0.2).toLocaleString()}</p>
        </div>
      </div>

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
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer"
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
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer"
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
                    className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all"
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  />
                  <span className="text-muted-foreground text-[10px] font-black tracking-widest">TO</span>
                  <input 
                    type="date" 
                    className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all"
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`$${totalProjectRevenue.toLocaleString()}`} color="text-blue-600" icon="↑" />
        <StatCard title="Total Costs" value={`$${totalCosts.toLocaleString()}`} color="text-rose-500" icon="↓" />
        <StatCard title="Net Profit" value={`$${netProfit.toLocaleString()}`} color="text-emerald-500" icon="∑" />
        <StatCard title="Profit Margin" value={`${profitMargin.toFixed(1)}%`} color="text-violet-500" icon="%" />
      </div>

      REVENUE SEGMENTATION
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-[2rem] border border-border flex items-center gap-6 group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl">🤝</div>
            <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Retainer Revenue</p>
                <p className="text-3xl font-black text-foreground font-mono tracking-tighter">${retainerRevenue.toLocaleString()}</p>
            </div>
        </div>
        <div className="bg-card p-6 rounded-[2rem] border border-border flex items-center gap-6 group">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-2xl">⚡</div>
            <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">One-Off Revenue</p>
                <p className="text-3xl font-black text-foreground font-mono tracking-tighter">${oneOffRevenue.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* LEDGERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <Link href={"finance/revenue-breakdown"}>
          <div>
            <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="font-black text-foreground text-sm uppercase tracking-widest">Revenue Breakdown</h3>
                <span className="text-[10px] font-black bg-blue-500 text-white px-3 py-1 rounded-full uppercase">
                    {filteredProjects.length} Items
                </span>
            </div>
            <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
                    <tr>
                        <th className="p-6 font-black tracking-widest">Client / Type</th>
                        <th className="p-6 text-right font-black tracking-widest">Contract</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="p-6">
                            <p className="font-black text-foreground text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.clientName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-muted-foreground">{p.date}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${p.type === 'retainer' ? 'border-blue-500/30 text-blue-500' : 'border-orange-500/30 text-orange-500'} uppercase`}>
                                    {p.type}
                                </span>
                            </div>
                        </td>
                        <td className="p-6 text-right font-mono font-black text-blue-600">
                            +${p.budget.toLocaleString()}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
        </Link>
        </div>

        <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
          <Link href={"finance/expense-ledger"}>
          <div>
            <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="font-black text-foreground text-sm uppercase tracking-widest">Expense Ledger</h3>
                <span className="text-[10px] font-black bg-rose-500 text-white px-3 py-1 rounded-full uppercase">
                    ${totalCosts.toLocaleString()}
                </span>
            </div>
            <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
                    <tr>
                        <th className="p-6 font-black tracking-widest">Resource</th>
                        <th className="p-6 text-right font-black tracking-widest">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {filteredProjects.length > 0 && employees.map((emp) => (
                    <tr key={`staff-${emp.id}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-6">
                            <p className="font-black text-foreground text-sm uppercase tracking-tight">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">Internal Monthly</p>
                        </td>
                        <td className="p-6 text-right font-mono font-black text-rose-500">
                            -${emp.monthlySalary.toLocaleString()}
                        </td>
                    </tr>
                ))}
                {filteredProjects.flatMap(p => Object.entries(p.services))
                    .filter(([_, detail]) => detail.isFreelancer)
                    .map(([serviceName, detail], idx) => (
                    <tr key={`free-${idx}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-6">
                            <p className="font-black text-foreground text-sm uppercase tracking-tight">{detail.employee}</p>
                            <p className="text-[10px] text-muted-foreground">{serviceName}</p>
                        </td>
                        <td className="p-6 text-right font-mono font-black text-rose-500">
                            -${Number(detail.salary).toLocaleString()}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </Link>
        </div>
        
      </div>

      {/* PROFITABILITY & CASH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
          <div className="p-6 bg-muted/20 border-b border-border font-black text-foreground text-[10px] uppercase tracking-[0.2em]">Project Profitability</div>
          <div className="p-6 space-y-6">
            {filteredProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-xs font-bold uppercase">No data for selected period</p>
            ) : filteredProjects.map(p => {
              const cost = Object.values(p.services).reduce((s, d) => s + Number(d.salary), 0);
              const margin = p.budget > 0 ? ((p.budget - cost) / p.budget) * 100 : 0;
              return (
                <div key={p.id} className="flex justify-between items-center group">
                  <div>
                    <p className="font-black text-sm text-foreground uppercase tracking-tight group-hover:text-blue-600 transition-colors">{p.projectName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{p.clientName}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-sm font-black text-emerald-500">+${(p.budget - cost).toLocaleString()}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{margin.toFixed(0)}% Margin</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-950 rounded-[2rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <span className="text-[12rem]">💰</span>
          </div>
          <div className="relative z-10">
            <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-[0.3em] mb-6">Cash Position</h4>
            <p className="text-6xl font-black font-mono tracking-tighter">$42,800.00</p>
            <div className="mt-4 flex items-center gap-2 text-blue-300/60 font-black text-[10px] uppercase tracking-widest">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Verified Treasury Balance
            </div>
          </div>
          <button className="relative z-10 w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] mt-12 hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-500/20">
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: any) {
  return (
    <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex justify-between items-start transition-all hover:border-blue-500/30 group">
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 tracking-widest group-hover:text-blue-600 transition-colors">{title}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
      </div>
      <div className="bg-muted w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
      </div>
    </div>
  );
}