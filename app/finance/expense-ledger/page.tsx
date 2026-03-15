"use client";

import React, { useState, useMemo } from "react";

// --- TYPES ---
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

interface ProjectContribution {
  projectName: string;
  amount: number;
}

interface Expense {
  id: number;
  date: string;
  recipient: string;
  category: "Payroll" | "Equipment Rental" | "Software" | "Marketing" | "Office" | "Tax";
  projectLink?: string;
  amount: number;
  status: "Cleared" | "Processing" | "Scheduled";
}

interface UpcomingSalary {
  id: string;
  employee: string;
  role: string;
  payoutDate: string;
  projects: ProjectContribution[];
}

interface RecurringCost {
  id: number;
  label: string;
  amount: number;
  category: "Rent" | "Subscription" | "Utilities";
  billingDate: string;
  interval: "Monthly" | "Annual";
}

export default function ExpenseLedgerPage() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  
  // --- FILTER STATES ---
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("5"); // June (0-indexed)
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [expenses] = useState<Expense[]>([
    { id: 1, date: "2024-06-10", recipient: "LensRentals Inc", category: "Equipment Rental", projectLink: "Nike Summer", amount: 1200, status: "Cleared" },
    { id: 2, date: "2024-06-12", recipient: "Adobe Creative Cloud", category: "Software", amount: 85, status: "Cleared" },
    { id: 3, date: "2024-06-15", recipient: "Sarah Jenkins (Freelance)", category: "Payroll", projectLink: "Apple Launch", amount: 4500, status: "Processing" },
    { id: 4, date: "2024-06-18", recipient: "AWS Hosting", category: "Software", amount: 310, status: "Scheduled" },
    { id: 5, date: "2024-06-20", recipient: "Downtown Studios", category: "Office", projectLink: "Nike Summer", amount: 2500, status: "Cleared" },
    { id: 6, date: "2024-06-21", recipient: "RED Camera Hire", category: "Equipment Rental", projectLink: "Coca Cola Batch", amount: 950, status: "Cleared" },
  ]);

  const upcomingPayroll: UpcomingSalary[] = [
    {
      id: "EMP-001",
      employee: "Marcus Holloway",
      role: "Lead Editor",
      payoutDate: "2024-07-01",
      projects: [{ projectName: "Nike Summer", amount: 2500 }, { projectName: "Coca Cola Batch", amount: 1200 }],
    },
    {
      id: "EMP-002",
      employee: "Elena Fisher",
      role: "Colorist",
      payoutDate: "2024-07-01",
      projects: [{ projectName: "Apple Launch", amount: 3200 }],
    },
  ];

  const recurringCosts: RecurringCost[] = [
    { id: 1, label: "Main Studio Rent", amount: 4200, category: "Rent", interval: "Monthly", billingDate: "01" },
    { id: 2, label: "Frame.io Enterprise", amount: 150, category: "Subscription", interval: "Monthly", billingDate: "25" },
    { id: 3, label: "Google Workspace", amount: 45, category: "Subscription", interval: "Monthly", billingDate: "28" },
  ];

  // --- FILTER ENGINE LOGIC ---
  const timeFilteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      
      if (filterMode === "MONTH") {
        return expDate.getMonth() === parseInt(selectedMonth);
      }
      
      if (filterMode === "CUSTOM") {
        if (!dateRange.start || !dateRange.end) return true;
        return expDate >= new Date(dateRange.start) && expDate <= new Date(dateRange.end);
      }

      if (filterMode === "PRESET" && activePreset !== "ALL") {
        const month = expDate.getMonth();
        if (activePreset === "Q1") return month >= 0 && month <= 2;
        if (activePreset === "Q2") return month >= 3 && month <= 5;
      }

      return true;
    });
  }, [expenses, filterMode, selectedMonth, dateRange, activePreset]);

  // Combined Filter (Time + Category)
  const finalExpenses = useMemo(() => {
    return activeTab === "ALL" 
      ? timeFilteredExpenses 
      : timeFilteredExpenses.filter(e => e.category === activeTab);
  }, [activeTab, timeFilteredExpenses]);

  const totalOutflow = finalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const rentalSpecifics = finalExpenses.filter(e => e.category === "Equipment Rental").reduce((sum, e) => sum + e.amount, 0);
  const burnRate = totalOutflow / 30;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-12">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Expense Ledger</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Operational Outflow & Rental Tracking</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-xl border border-border overflow-x-auto max-w-full">
          {["ALL", "Equipment Rental", "Payroll", "Software", "Office"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 text-[10px] whitespace-nowrap font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === cat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
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

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBlock title="Total Outflow" value={`$${totalOutflow.toLocaleString()}`} sub="Filtered View" color="text-rose-500" />
        <StatBlock title="Rental Expenditure" value={`$${rentalSpecifics.toLocaleString()}`} sub="Active Selection" color="text-blue-500" />
        <StatBlock title="Daily Burn Rate" value={`$${burnRate.toFixed(2)}`} sub="Based on Filter" color="text-foreground" />
      </div>

      {/* UPCOMING PAYROLL TABLE */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-rose-600">Upcoming Payroll</h2>
          <div className="h-px flex-1 bg-rose-600/20"></div>
        </div>
        <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Employee / Role</th>
                <th className="p-6">Project Breakdown</th>
                <th className="p-6">Payout Date</th>
                <th className="p-6 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcomingPayroll.map((salary) => {
                const totalPayout = salary.projects.reduce((sum, p) => sum + p.amount, 0);
                return (
                  <tr key={salary.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="p-6">
                      <p className="font-black text-foreground text-sm uppercase tracking-tight">{salary.employee}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{salary.role}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-wrap gap-2">
                        {salary.projects.map((p, i) => (
                          <span key={i} className="text-[9px] bg-muted px-2 py-1 rounded border border-border font-bold text-foreground">{p.projectName}: ${p.amount.toLocaleString()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-6"><p className="text-[10px] font-black text-foreground uppercase">{salary.payoutDate}</p></td>
                    <td className="p-6 text-right font-mono font-black text-rose-600 text-lg">${totalPayout.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* FIXED MONTHLY COSTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-black uppercase tracking-tighter italic text-blue-600">Fixed Monthly Costs</h2>
            <div className="h-px flex-1 bg-blue-600/20"></div>
          </div>
          <button className="ml-4 bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 px-4">
            <span className="text-[10px] font-black uppercase tracking-widest">Add Recurring</span>
          </button>
        </div>
        <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Service</th>
                <th className="p-6">Category</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recurringCosts.map((cost) => (
                <tr key={cost.id} className="p-6">
                  <td className="p-6 font-black text-foreground uppercase text-xs">{cost.label}</td>
                  <td className="p-6"><span className="text-[9px] font-black px-2 py-1 rounded bg-blue-100 text-blue-700 uppercase">{cost.category}</span></td>
                  <td className="p-6 text-right font-mono font-black text-foreground">${cost.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t border-border">
              <tr>
                <td colSpan={2} className="p-6 text-right text-[10px] font-black uppercase text-muted-foreground">Monthly Overhead:</td>
                <td className="p-6 text-right font-mono font-black text-blue-600">${recurringCosts.reduce((s, c) => s + c.amount, 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* MASTER EXPENSE TABLE */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
          <h3 className="font-black text-foreground text-[10px] uppercase tracking-[0.2em]">Transaction History</h3>
          <button className="bg-rose-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Log New Expense</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Date</th>
                <th className="p-6">Recipient</th>
                <th className="p-6">Category</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {finalExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="p-6 text-[10px] font-black text-foreground">{exp.date}</td>
                  <td className="p-6">
                    <p className="font-black text-foreground text-sm uppercase">{exp.recipient}</p>
                    {exp.projectLink && <p className="text-[10px] text-blue-600 font-bold uppercase">Project: {exp.projectLink}</p>}
                  </td>
                  <td className="p-6"><span className="text-[9px] font-black px-2 py-1 rounded bg-muted text-muted-foreground uppercase">{exp.category}</span></td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${exp.status === 'Cleared' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                      <span className="text-[10px] font-bold text-foreground uppercase">{exp.status}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right font-mono font-black text-foreground">-${exp.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ title, value, sub, color }: any) {
  return (
    <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm group hover:border-rose-500/30 transition-all">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">{sub}</p>
    </div>
  );
}