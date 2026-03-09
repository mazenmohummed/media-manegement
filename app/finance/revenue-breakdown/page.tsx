"use client";

import React, { useState, useMemo } from "react";

// --- TYPES ---
type Category = "Consultation" | "Video" | "Photo" | "Design" | "Sponsor" | "Copy Writer" | "Content preparation";
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

interface RevenueEntry {
  id: number;
  client: string;
  project: string;
  category: Category;
  status: "Paid" | "Pending" | "Invoiced";
  amount: number;
  date: string; 
  margin: number;
}

const CATEGORIES: Category[] = [
  "Consultation", "Video", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"
];

export default function RevenueBreakdownPage() {
  // --- STATE: GLOBAL FILTERS ---
  const [selectedCats, setSelectedCats] = useState<Category[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("0");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generalSearch, setGeneralSearch] = useState("");

  const [revenueData] = useState<RevenueEntry[]>([
    { id: 1, client: "Nike", project: "Summer Campaign", category: "Video", status: "Paid", amount: 15000, date: "2024-05-12", margin: 65 },
    { id: 2, client: "Coca Cola", project: "Content Batch", category: "Photo", status: "Invoiced", amount: 8500, date: "2024-06-01", margin: 42 },
    { id: 3, client: "Apple", project: "Product Launch", category: "Design", status: "Pending", amount: 12000, date: "2024-01-15", margin: 78 },
    { id: 4, client: "Local Shop", project: "Rebrand", category: "Design", status: "Paid", amount: 3500, date: "2024-04-20", margin: 55 },
    { id: 5, client: "Red Bull", project: "Event Coverage", category: "Sponsor", status: "Paid", amount: 9000, date: "2024-03-28", margin: 30 },
    { id: 6, client: "Nike", project: "Winter Gear", category: "Video", status: "Paid", amount: 22000, date: "2024-11-12", margin: 70 },
    { id: 7, client: "Nike", project: "Summer Campaign", category: "Copy Writer", status: "Paid", amount: 2000, date: "2024-05-14", margin: 90 },
  ]);

  // --- UNIFIED FILTER ENGINE ---
  const masterFilteredData = useMemo(() => {
    return revenueData.filter(item => {
      const catMatch = selectedCats.length === 0 || selectedCats.includes(item.category);
      
      const itemDate = new Date(item.date);
      let timeMatch = true;
      if (filterMode === "PRESET") {
        if (activePreset === "Q1") timeMatch = itemDate.getMonth() <= 2;
        if (activePreset === "Q2") timeMatch = itemDate.getMonth() >= 3 && itemDate.getMonth() <= 5;
      } else if (filterMode === "MONTH") {
        timeMatch = itemDate.getMonth() === parseInt(selectedMonth);
      } else if (filterMode === "CUSTOM") {
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        if (start && itemDate < start) timeMatch = false;
        if (end && itemDate > end) timeMatch = false;
      }

      const searchLower = generalSearch.toLowerCase();
      const searchMatch = generalSearch === "" || 
        item.client.toLowerCase().includes(searchLower) || 
        item.project.toLowerCase().includes(searchLower) || 
        item.category.toLowerCase().includes(searchLower);

      return catMatch && timeMatch && searchMatch;
    });
  }, [selectedCats, filterMode, activePreset, selectedMonth, dateRange, generalSearch, revenueData]);

  // --- DERIVED DATA FOR NEW TABLE ---
  const paymentEntries = useMemo(() => {
    return masterFilteredData.filter(item => item.status === "Paid");
  }, [masterFilteredData]);

  // --- SUMMARIES ---
  const projectSummaries = useMemo(() => {
    const summaryMap: Record<string, { name: string, client: string, total: number, count: number, avgMargin: number }> = {};
    masterFilteredData.forEach(item => {
      if (!summaryMap[item.project]) {
        summaryMap[item.project] = { name: item.project, client: item.client, total: 0, count: 0, avgMargin: 0 };
      }
      summaryMap[item.project].total += item.amount;
      summaryMap[item.project].avgMargin += item.margin;
      summaryMap[item.project].count += 1;
    });
    return Object.values(summaryMap);
  }, [masterFilteredData]);

  const totalRevenue = masterFilteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Revenue Command</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Unified Data Stream</p>
        </div>
        
        <div className="relative w-full md:w-96">
            <input 
                type="text" 
                placeholder="Search Clients, Projects..." 
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

      {/* NEW: CLIENT PAYMENTS TABLE (Integrated) */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Payment Receipt Tracker</h2>
        </div>
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-600/5 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Receipt Date</th>
                <th className="p-6">Method / Description</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {paymentEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-blue-500/[0.02] transition-colors">
                  <td className="p-6 font-mono text-[11px] text-muted-foreground">{entry.date}</td>
                  <td className="p-6">
                    <p className="font-black text-foreground text-sm uppercase tracking-tight">{entry.project}</p>
                    <p className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">{entry.client} • Verified Receipt</p>
                  </td>
                  <td className="p-6">
                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-6 text-right font-mono font-black text-emerald-500">
                    +${entry.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paymentEntries.length === 0 && (
            <div className="p-16 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">
              No Payment History Recorded
            </div>
          )}
        </div>
      </section>

      {/* TABLE 1: AGGREGATES */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-center text-muted-foreground">Campaign Totals</h2>
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Project</th>
                <th className="p-6">Client</th>
                <th className="p-6 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectSummaries.map((proj, idx) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors">
                  <td className="p-6 font-black text-foreground text-sm uppercase">{proj.name}</td>
                  <td className="p-6 text-[10px] font-bold text-blue-600 uppercase tracking-widest">{proj.client}</td>
                  <td className="p-6 text-right font-mono font-black text-foreground text-lg">${proj.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TABLE 2: TASKS REVENUE (LINE ITEM BREAKDOWN) */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-center text-muted-foreground">Individual Tasks & Services</h2>
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Task Context</th>
                <th className="p-6">Service Type</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Task Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {masterFilteredData.map((item) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-6">
                    <p className="font-black text-foreground text-[11px] uppercase tracking-tight">{item.project}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">{item.client}</p>
                  </td>
                  <td className="p-6">
                    <span className="inline-block px-3 py-1 rounded-lg bg-foreground text-background text-[9px] font-black uppercase tracking-tighter">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'Paid' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-6 text-right font-mono font-black text-foreground">
                    ${item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {masterFilteredData.length === 0 && (
            <div className="p-20 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">
              No matching tasks found
            </div>
          )}
        </div>
      </section>

      {/* FOOTER TOTALS */}
      <div className="bg-foreground text-background p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl mt-12">
        <div className="flex items-center gap-10">
            <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Total Result Revenue</p>
                <h3 className="text-4xl font-black font-mono tracking-tighter">${totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:block">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Total Entries</p>
                <p className="text-2xl font-black font-mono tracking-tighter">{masterFilteredData.length}</p>
            </div>
        </div>
        <button className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all w-full md:w-auto">
            Export Financial Report
        </button>
      </div>

    </div>
  );
}