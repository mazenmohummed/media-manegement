"use client";

import React, { useState, useMemo } from "react";

// --- INTERFACES ---
interface Expense {
  id: number;
  date: string;
  recipient: string;
  category: "Payroll" | "Equipment Rental" | "Software" | "Marketing" | "Office" | "Tax";
  projectLink?: string; // Links back to the Media Production Hub projects
  amount: number;
  status: "Cleared" | "Processing" | "Scheduled";
}

export default function ExpenseLedgerPage() {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const [expenses] = useState<Expense[]>([
    { id: 1, date: "2024-06-10", recipient: "LensRentals Inc", category: "Equipment Rental", projectLink: "Nike Summer", amount: 1200, status: "Cleared" },
    { id: 2, date: "2024-06-12", recipient: "Adobe Creative Cloud", category: "Software", amount: 85, status: "Cleared" },
    { id: 3, date: "2024-06-15", recipient: "Sarah Jenkins (Freelance)", category: "Payroll", projectLink: "Apple Launch", amount: 4500, status: "Processing" },
    { id: 4, date: "2024-06-18", recipient: "AWS Hosting", category: "Software", amount: 310, status: "Scheduled" },
    { id: 5, date: "2024-06-20", recipient: "Downtown Studios", category: "Office", projectLink: "Nike Summer", amount: 2500, status: "Cleared" },
    { id: 6, date: "2024-06-21", recipient: "RED Camera Hire", category: "Equipment Rental", projectLink: "Coca Cola Batch", amount: 950, status: "Cleared" },
  ]);

  // --- CALCULATIONS ---
  const filteredExpenses = useMemo(() => {
    return activeTab === "ALL" ? expenses : expenses.filter(e => e.category === activeTab);
  }, [activeTab, expenses]);

  const totalOutflow = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const rentalSpecifics = expenses.filter(e => e.category === "Equipment Rental").reduce((sum, e) => sum + e.amount, 0);
  const burnRate = totalOutflow / 30; // Monthly average daily burn

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      
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

      {/* FINANCIAL HEALTH METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBlock title="Total Outflow" value={`$${totalOutflow.toLocaleString()}`} sub="Current Period" color="text-rose-500" />
        <StatBlock title="Rental Expenditure" value={`$${rentalSpecifics.toLocaleString()}`} sub="External Gear Costs" color="text-blue-500" />
        <StatBlock title="Daily Burn Rate" value={`$${burnRate.toFixed(2)}`} sub="Avg. Cost Per Day" color="text-foreground" />
      </div>

      {/* MASTER EXPENSE TABLE */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-black text-foreground text-[10px] uppercase tracking-[0.2em]">Transaction History</h3>
            <button className="bg-rose-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors">
                Log New Expense
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Date / Ref</th>
                <th className="p-6">Recipient / Project</th>
                <th className="p-6">Category</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="p-6">
                    <p className="text-[10px] font-black text-foreground">{exp.date}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">TXN-00{exp.id}</p>
                  </td>
                  <td className="p-6">
                    <p className="font-black text-foreground text-sm uppercase tracking-tight">{exp.recipient}</p>
                    {exp.projectLink && (
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Project: {exp.projectLink}</p>
                    )}
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black px-2 py-1 rounded bg-muted text-muted-foreground uppercase tracking-tighter`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        exp.status === 'Cleared' ? 'bg-emerald-500' : 
                        exp.status === 'Processing' ? 'bg-orange-500' : 'bg-slate-400'
                      }`} />
                      <span className="text-[10px] font-bold text-foreground uppercase">{exp.status}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right font-mono font-black text-foreground">
                    -${exp.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENTAL VS OWNED ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-950 rounded-[2rem] p-8 text-white">
          <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-[0.3em] mb-6">Rental Efficiency</h4>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            You are currently spending **${rentalSpecifics}** on external rentals. 
            If this exceeds $5,000/mo, our algorithm recommends purchasing core assets to increase long-term margin.
          </p>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${(rentalSpecifics / 5000) * 100}%` }} />
          </div>
          <p className="text-[9px] font-black uppercase mt-3 text-slate-500 tracking-widest">
            Investment Threshold: 24% Reached
          </p>
        </div>

        <div className="bg-card border border-border rounded-[2rem] p-8 flex flex-col justify-center">
            <h4 className="font-black text-muted-foreground uppercase text-[10px] tracking-[0.3em] mb-2">Next Scheduled Outflow</h4>
            <div className="flex justify-between items-end border-b border-border py-4">
                <div>
                    <p className="text-xl font-black text-foreground uppercase tracking-tight">AWS & Software</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">June 18, 2024</p>
                </div>
                <p className="text-xl font-mono font-black">$395.00</p>
            </div>
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
      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">
        {sub}
      </p>
    </div>
  );
}