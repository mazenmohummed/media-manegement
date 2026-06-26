"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Camera, 
  ArrowDownRight, 
  ArrowUpRight, 
  Repeat, 
  History,
  ShieldCheck,
  Package,
  Loader2,
  Calendar
} from "lucide-react";

export default function EquipmentFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ── FILTER STATES ─────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        const res = await fetch("/api/finance/equipment");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch equipment stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipmentData();
  }, []);

  // ── DYNAMIC INVENTORY & LEAKAGE FILTER PIPELINE ───────────────────────────
  const filteredData = useMemo(() => {
    const assetsArray = data?.assets ?? [];
    const internalLeakageList = data?.leakageItems ?? [];
    const hasDateFilter = startDate || endDate;

    // 1. Filter Assets by Category Selector
    const assets = activeCategory === "ALL" 
      ? assetsArray 
      : assetsArray.filter((item: any) => item.category === activeCategory);

    // 2. Filter Leakage Items by Selected Date Range Window
    const leakageItems = internalLeakageList.filter((item: any) => {
      if (!hasDateFilter) return true;

      // Fallback timeline boundary checks using operational dates or fallback creation dates
      const txTime = new Date(item.date || item.createdAt).getTime();
      const startThreshold = startDate ? new Date(startDate).getTime() : null;
      const endThreshold = endDate ? new Date(endDate).getTime() : null;

      const matchesStart = startThreshold ? txTime >= startThreshold : true;
      // Adds 86400000ms (1 day) to include the selected end date fully
      const matchesEnd = endThreshold ? txTime <= endThreshold + 86400000 : true;

      return matchesStart && matchesEnd;
    });

    // 3. Recalculate Leakage Aggregation dynamically based on timeline choices
    const dynamicLeakageAmount = leakageItems.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);

    return {
      assets,
      leakageItems,
      dynamicLeakageAmount
    };
  }, [activeCategory, startDate, endDate, data]);

  if (loading || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Scanning Inventory...</p>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Camera size={14} className="text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Asset ROI & Rental Analysis</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Equipment <span className="text-orange-500">Finance</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Portfolio Valuation</p>
            <p className="text-2xl font-black font-mono text-foreground italic">
              ${(data?.metrics?.totalValuation ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      {/* FILTER HUB WITH DATES INPUTS */}
      {/* CATEGORY FILTER BUTTONS ROW */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/80 overflow-x-auto scrollbar-none h-full">
          {["ALL", "Camera", "Computing", "Lighting", "Audio"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 text-center py-2.5 px-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat 
                  ? "bg-background text-blue-600 shadow-sm border border-border/40" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      <div className="bg-card border border-border p-5 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-orange-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>

        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-orange-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>

        
      </div>

      {/* CORE METRICS MATCHING REACTIVE SELECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EquipmentStatCard 
          label="Rental Leakage" 
          value={`$${filteredData.dynamicLeakageAmount.toLocaleString()}`} 
          sub="External Rental Costs" 
          color="rose" 
          icon={<ArrowDownRight size={18}/>} 
        />
        <EquipmentStatCard 
          label="Asset ROI" 
          value={data?.metrics?.assetROI ?? "0%"} 
          sub="Revenue vs Purchase Cost" 
          color="emerald" 
          icon={<ArrowUpRight size={18}/>} 
        />
        <EquipmentStatCard 
          label="Utilization Rate" 
          value={`${data?.metrics?.avgUtilization ?? 0}%`} 
          sub="Assets in active tasks" 
          color="blue" 
          icon={<Repeat size={18}/>} 
        />
      </div>

      {/* INVENTORY TABLE */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 italic whitespace-nowrap">Inventory Profitability</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
                <tr>
                  <th className="p-8">Equipment Item</th>
                  <th className="p-8">Basis Cost</th>
                  <th className="p-8">Revenue Generated</th>
                  <th className="p-8">Efficiency</th>
                  <th className="p-8 text-right">ROI Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-sm">
                {filteredData.assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center uppercase tracking-widest text-[10px] font-bold text-muted-foreground/40 italic">
                      No assets found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredData.assets.map((asset: any) => (
                    <AssetRow 
                      key={asset.id}
                      name={asset.name} 
                      category={asset.category} 
                      cost={`$${(asset.cost ?? 0).toLocaleString()}`} 
                      revenue={`$${(asset.revenue ?? 0).toLocaleString()}`} 
                      efficiency={`${asset.roi ?? 0}%`} 
                      status={asset.status ?? "N/A"} 
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* RENTAL ANALYSIS WITH LOGICAL LIVE CALCULATIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="bg-rose-50 rounded-[3rem] border-2 border-rose-100 p-10 space-y-6">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500 rounded-2xl text-white">
                 <History size={20} />
              </div>
              <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Rental Leakage Analysis</h4>
                 <p className="text-xs font-bold text-rose-900/60 uppercase italic">Capital outflow to vendors</p>
              </div>
           </div>
           
           <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
            {filteredData.leakageItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-rose-200 rounded-2xl bg-white/30">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-900/40">
                  No Leakage Items Inside Date Frame
                </p>
              </div>
            ) : (
              filteredData.leakageItems.map((item: any) => (
                <RentalIssue 
                  key={item.id} 
                  item={item.item} 
                  cost={`$${(item.cost ?? 0).toLocaleString()}`} 
                  project={item.project} 
                  // Pass the transaction date down to the sub-component
                  date={item.date || item.createdAt} 
                />
              ))
            )}
          </div>

           <div className="pt-6 border-t border-rose-200">
              <p className="text-[10px] font-black text-rose-900 uppercase italic">Buy vs Rent Intelligence:</p>
              <p className="text-xs font-bold text-rose-800/80 mt-1 uppercase leading-relaxed">
                Your leakage for this frame is <span className="font-black text-rose-600">${filteredData.dynamicLeakageAmount.toLocaleString()}</span>. 
                Internalizing these assets would increase project margins by approximately <span className="font-black underline">12.5%</span>.
              </p>
           </div>
        </div>

        <div className="bg-slate-950 rounded-[3rem] p-10 text-white flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package size={150} />
          </div>
          
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400 mb-6 italic">Portfolio Strategy</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-white uppercase leading-tight">Equipment Health</h3>
            
            <div className="grid grid-cols-2 gap-8 mt-10">
               <div>
                  <p className="text-[8px] uppercase font-black opacity-50 mb-2">Portfolio Growth</p>
                  <p className="text-xl font-black italic text-emerald-400">+14.2%</p>
               </div>
               <div>
                  <p className="text-[8px] uppercase font-black opacity-50 mb-2">Service Status</p>
                  <div className="flex items-center gap-2">
                     <ShieldCheck size={16} className="text-emerald-400" />
                     <p className="text-xl font-black italic text-emerald-400 tracking-tighter uppercase">Clear</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS REMAIN UNCHANGED ---
function EquipmentStatCard({ label, value, sub, color, icon }: any) {
  const themes: any = {
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/20",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20"
  };
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex justify-between items-start group hover:border-foreground/10 transition-all">
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-3xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl ${themes[color]}`}>{icon}</div>
    </div>
  );
}

function AssetRow({ name, category, cost, revenue, efficiency, status }: any) {
  const isRecouping = status === "Recouping";
  return (
    <tr className="group hover:bg-muted/10 transition-colors">
      <td className="p-8">
        <p className="font-black text-sm uppercase tracking-tight italic text-foreground font-sans group-hover:text-orange-500 transition-colors">{name}</p>
        <p className="text-[9px] text-orange-500 font-bold uppercase font-sans tracking-widest">{category}</p>
      </td>
      <td className="p-8 text-muted-foreground font-black font-mono">{cost}</td>
      <td className="p-8 text-emerald-500 font-black font-mono">+{revenue}</td>
      <td className="p-8 text-foreground font-black opacity-60 font-mono">{efficiency}</td>
      <td className="p-8 text-right">
        <div className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic shadow-sm ${
          isRecouping ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
        }`}>{status}</div>
      </td>
    </tr>
  );
}

function RentalIssue({ item, cost, project, date }: any) {
  const formattedDate = date 
    ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
    : "N/A";

  return (
    <div className="flex justify-between items-center p-5 bg-white/50 rounded-2xl border border-rose-200 hover:border-rose-400 transition-colors group">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-black text-rose-900 uppercase italic group-hover:text-rose-600 transition-colors">
            {item}
          </p>
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-700 rounded-md tracking-tight">
            {formattedDate}
          </span>
        </div>
        <p className="text-[8px] font-bold text-rose-800/60 uppercase tracking-widest">
          Project: {project}
        </p>
      </div>
      <p className="font-mono font-black text-sm text-rose-600">
        {cost}
      </p>
    </div>
  );
}