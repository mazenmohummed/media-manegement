"use client";

import React, { useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  Zap
} from "lucide-react";

export default function FinanceOverviewPage() {
  // --- BUSINESS LOGIC (Aggregated from Partitions) ---
  
  // 1. Client Partition Data
  const clientStats = {
    totalDue: 145200, // Sum of all project.totalValue where status != PAID
    totalInvoiced: 450000,
    averageProjectProfit: 12400
  };

  // 2. Employee Partition Data
  const employeeStats = {
    monthlyPayroll: 24500,
    averageEfficiency: 1.15, // From user.efficiencyRate
    topEarner: "Marcus Holloway"
  };

  // 3. Equipment Partition Data
  const equipmentStats = {
    rentalOutflow: 8400, // Sum of ExternalRental.cost
    assetValuation: 120000 // Sum of Asset.currentValue
  };

  // 4. Agency Overhead
  const overhead = {
    fixedCosts: 5200, // Rent, software, etc.
    burnRate: 1100 // Daily operational cost
  };

  const netPosition = clientStats.totalInvoiced - (employeeStats.monthlyPayroll + equipmentStats.rentalOutflow + overhead.fixedCosts);

  return (
    <div className="p-10 space-y-12 max-w-[1400px]">
      {/* 1. HEADER & GLOBAL STATUS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Fiscal Command Center</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground">
            Financial <span className="text-blue-600">Overview</span>
          </h1>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-3xl shadow-sm flex items-center gap-6">
          <div className="text-right border-r border-border pr-6">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Net Position</p>
            <p className="text-2xl font-black font-mono text-emerald-500 italic">${netPosition.toLocaleString()}</p>
          </div>
          <button className="bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
            Download Q1 Ledger
          </button>
        </div>
      </header>

      {/* 2. PARTITION PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PartitionCard 
          label="Clients" 
          value={`$${clientStats.totalDue.toLocaleString()}`} 
          sub="Total Due Balance" 
          trend="+12%" 
          color="blue"
          icon={<Target size={18} />}
        />
        <PartitionCard 
          label="Employees" 
          value={`$${employeeStats.monthlyPayroll.toLocaleString()}`} 
          sub="Monthly Payroll" 
          trend="Stable" 
          color="rose"
          icon={<Activity size={18} />}
        />
        <PartitionCard 
          label="Equipment" 
          value={`$${equipmentStats.rentalOutflow.toLocaleString()}`} 
          sub="External Rental Cost" 
          trend="-4%" 
          color="orange"
          icon={<Zap size={18} />}
        />
        <PartitionCard 
          label="Overhead" 
          value={`$${overhead.fixedCosts.toLocaleString()}`} 
          sub="Fixed Agency Costs" 
          trend="Locked" 
          color="slate"
          icon={<DollarSign size={18} />}
        />
      </div>

      {/* 3. PROFITABILITY BREAKDOWN (The Dual-Track View) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* LEFT: REVENUE FLOW (Clients & Projects) */}
        <section className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">Revenue Partition</h2>
            <div className="h-px flex-1 bg-blue-600/20" />
          </div>
          
          <div className="bg-card rounded-[3rem] border border-border p-8 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Invoiced YTD</p>
                <p className="text-5xl font-black italic">$450,000.00</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                  <TrendingUp size={12} /> Target Met
                </p>
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-emerald-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              <MiniStat label="Avg. Project Profit" value={`$${clientStats.averageProjectProfit.toLocaleString()}`} />
              <MiniStat label="Top Client" value="Nike" />
              <MiniStat label="Pending Payouts" value="12 Projects" />
            </div>
          </div>
        </section>

        {/* RIGHT: EFFICIENCY TRACKER (Employees & Assets) */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 italic">Efficiency Partition</h2>
            <div className="h-px flex-1 bg-rose-600/20" />
          </div>

          <div className="bg-slate-950 rounded-[3rem] p-8 text-white space-y-8 h-full">
            <div>
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-4">Top Performance</p>
              <p className="text-xs font-bold opacity-60 uppercase mb-1">Highest Profit Generator</p>
              <p className="text-3xl font-black italic uppercase">{employeeStats.topEarner}</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-60">Human Capital ROI</span>
                  <span className="text-sm font-black text-emerald-400">4.2x</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-60">Daily Burn Rate</span>
                  <span className="text-sm font-black text-rose-400">-${overhead.burnRate}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-60">Asset Utilization</span>
                  <span className="text-sm font-black text-blue-400">82%</span>
               </div>
            </div>

            <button className="w-full mt-4 py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
              Detailed ROI Report
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function PartitionCard({ label, value, sub, trend, color, icon }: any) {
  const colorMap: any = {
    blue: "text-blue-600 border-blue-500/20",
    rose: "text-rose-600 border-rose-500/20",
    orange: "text-orange-600 border-orange-500/20",
    slate: "text-slate-600 border-slate-500/20",
  };

  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm group hover:border-foreground/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-muted ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{trend}</span>
      </div>
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic mb-1">{label}</p>
        <p className="text-2xl font-black font-mono italic">{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-1 tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">{value}</p>
    </div>
  );
}