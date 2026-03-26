"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, Receipt, Activity, DollarSign, 
  Target, Zap, Globe, Loader2 
} from "lucide-react";

export default function FinanceOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/finance/overview");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Finance Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Calculating Fiscal Position...</p>
      </div>
    );
  }

  const netPosition = data.clientStats.totalInvoiced - 
    (data.employeeStats.monthlyPayroll + data.equipmentStats.rentalOutflow + data.overhead.fixedCosts);

  return (
    <div className="p-10 space-y-12 max-w-[1400px] animate-in fade-in duration-700">
      {/* HEADER */}
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
            <p className={`text-2xl font-black font-mono italic ${netPosition >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ${netPosition.toLocaleString()}
            </p>
          </div>
          <button className="bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
            Download Ledger
          </button>
        </div>
      </header>

      {/* PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PartitionCard 
          label="Clients" 
          value={`$${data.clientStats.totalDue.toLocaleString()}`} 
          sub="Total Due Balance" 
          trend="Live" 
          color="blue"
          icon={<Target size={18} />}
        />
        <PartitionCard 
          label="Employees" 
          value={`$${data.employeeStats.monthlyPayroll.toLocaleString()}`} 
          sub="Monthly Payroll" 
          trend={`Eff: ${data.employeeStats.averageEfficiency}x`} 
          color="rose"
          icon={<Activity size={18} />}
        />
        <PartitionCard 
          label="Equipment" 
          value={`$${data.equipmentStats.rentalOutflow.toLocaleString()}`} 
          sub="External Rental Cost" 
          trend="Outflow" 
          color="orange"
          icon={<Zap size={18} />}
        />
        <PartitionCard 
          label="Overhead" 
          value={`$${data.overhead.fixedCosts.toLocaleString()}`} 
          sub="Fixed Agency Costs" 
          trend="Burn" 
          color="slate"
          icon={<DollarSign size={18} />}
        />
      </div>

      {/* PROFITABILITY BREAKDOWN */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <section className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">Revenue Partition</h2>
            <div className="h-px flex-1 bg-blue-600/20" />
          </div>
          <div className="bg-card rounded-[3rem] border border-border p-8 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Invoiced YTD</p>
                <p className="text-5xl font-black italic">${data.clientStats.totalInvoiced.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              <MiniStat label="Avg. Project Profit" value={`$${Math.round(data.clientStats.averageProjectProfit).toLocaleString()}`} />
              <MiniStat label="Asset Valuation" value={`$${data.equipmentStats.assetValuation.toLocaleString()}`} />
              <MiniStat label="Daily Burn" value={`$${Math.round(data.overhead.burnRate)}`} />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 italic">Efficiency Partition</h2>
            <div className="h-px flex-1 bg-rose-600/20" />
          </div>
          <div className="bg-slate-950 rounded-[3rem] p-8 text-white space-y-8 h-full">
            <div>
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-4">Top Earner</p>
              <p className="text-3xl font-black italic uppercase text-emerald-400">{data.employeeStats.topEarner}</p>
              <p className="text-xs font-bold opacity-60 uppercase mt-2">Highest Profit Contribution</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Sub-components as defined in your previous snippet...
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
        <div className={`p-3 rounded-2xl bg-muted ${colorMap[color]}`}>{icon}</div>
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