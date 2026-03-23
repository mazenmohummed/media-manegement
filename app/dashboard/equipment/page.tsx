"use client";

import React, { useState, useMemo } from "react";

// --- INTERFACES ---
interface Equipment {
  id: number;
  name: string;
  category: "Camera" | "Computing" | "Lighting" | "Audio" | "Other";
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number; // For depreciation tracking
  status: "Available" | "On Set" | "Maintenance";
  assignedTo?: string;
}

export default function EquipmentPage() {
  // --- STATE ---
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [inventory] = useState<Equipment[]>([
    {
      id: 1,
      name: "RED V-Raptor 8K",
      category: "Camera",
      purchaseDate: "2024-05-10",
      purchasePrice: 24500,
      currentValue: 21000,
      status: "On Set",
      assignedTo: "Summer Campaign"
    },
    {
      id: 2,
      name: "Mac Studio M2 Ultra",
      category: "Computing",
      purchaseDate: "2024-01-15",
      purchasePrice: 6000,
      currentValue: 4800,
      status: "Available"
    },
    {
      id: 3,
      name: "Aputure 600d Pro",
      category: "Lighting",
      purchaseDate: "2023-11-20",
      purchasePrice: 1890,
      currentValue: 1500,
      status: "Maintenance"
    },
    {
      id: 4,
      name: "Sennheiser MKH 416",
      category: "Audio",
      purchaseDate: "2024-02-01",
      purchasePrice: 1000,
      currentValue: 900,
      status: "Available"
    }
  ]);

  // --- CALCULATIONS ---
  const filteredInventory = useMemo(() => {
    return activeCategory === "ALL" 
      ? inventory 
      : inventory.filter(item => item.category === activeCategory);
  }, [activeCategory, inventory]);

  const totalAssetValue = inventory.reduce((sum, item) => sum + item.purchasePrice, 0);
  const currentPortfolioValue = inventory.reduce((sum, item) => sum + item.currentValue, 0);
  const totalDepreciation = totalAssetValue - currentPortfolioValue;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Asset Inventory</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Hardware & Capital Management</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          {["ALL", "Camera", "Computing", "Lighting", "Audio"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeCategory === cat 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ASSET METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AssetCard 
            title="Total Investment" 
            value={`$${totalAssetValue.toLocaleString()}`} 
            subText="Lifetime Purchase Value" 
            color="text-foreground"
        />
        <AssetCard 
            title="Net Asset Value" 
            value={`$${currentPortfolioValue.toLocaleString()}`} 
            subText="Current Resale Estimate" 
            color="text-blue-600"
        />
        <AssetCard 
            title="Total Depreciation" 
            value={`-$${totalDepreciation.toLocaleString()}`} 
            subText="Value Lost Over Time" 
            color="text-rose-500"
        />
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-black text-foreground text-sm uppercase tracking-widest">Master Equipment List</h3>
            <button className="bg-foreground text-background px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity">
                + Add Asset
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/5">
                    <tr>
                        <th className="p-6 font-black tracking-widest">Asset Name</th>
                        <th className="p-6 font-black tracking-widest">Category</th>
                        <th className="p-6 font-black tracking-widest">Status</th>
                        <th className="p-6 font-black tracking-widest">Purchase</th>
                        <th className="p-6 text-right font-black tracking-widest">Current Value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                            <td className="p-6">
                                <p className="font-black text-foreground text-sm uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                    {item.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: EQ-{item.id.toString().padStart(4, '0')}</p>
                            </td>
                            <td className="p-6">
                                <span className="text-[10px] font-black text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                                    {item.category}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                        item.status === 'Available' ? 'bg-emerald-500' : 
                                        item.status === 'On Set' ? 'bg-blue-500' : 'bg-rose-500'
                                    }`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                        {item.status}
                                    </p>
                                </div>
                                {item.assignedTo && (
                                    <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                                        {item.assignedTo}
                                    </p>
                                )}
                            </td>
                            <td className="p-6">
                                <p className="text-[10px] font-black text-foreground uppercase">{item.purchaseDate}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">${item.purchasePrice.toLocaleString()}</p>
                            </td>
                            <td className="p-6 text-right font-mono font-black text-foreground">
                                ${item.currentValue.toLocaleString()}
                                <div className="text-[9px] text-rose-500 font-black uppercase mt-1">
                                    -{Math.round(((item.purchasePrice - item.currentValue) / item.purchasePrice) * 100)}%
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* MAINTENANCE & UTILIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-950 rounded-[2rem] p-8 text-white">
                <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-[0.3em] mb-6">Equipment Utilization</h4>
                <div className="space-y-6">
                    <UtilizationBar label="Cameras" percentage={85} />
                    <UtilizationBar label="Computing" percentage={100} />
                    <UtilizationBar label="Lighting" percentage={40} />
                </div>
            </div>

            <div className="bg-card rounded-[2rem] border border-border p-8 flex flex-col justify-between">
                <div>
                    <h4 className="font-black text-muted-foreground uppercase text-[10px] tracking-[0.3em] mb-4">Internal Asset Policy</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        All equipment must be inspected upon return. Assets with &gt;25% depreciation within 12 months require a usage audit. 
                        **Maintenance mode** locks assets from being assigned to active project budgets.
                    </p>
                </div>
                <button className="mt-8 border-2 border-foreground text-foreground w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-all">
                    Generate Insurance Report
                </button>
            </div>
      </div>
    </div>
  );
}

function AssetCard({ title, value, subText, color }: any) {
    return (
      <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border group hover:border-blue-500/30 transition-all">
        <p className="text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">{title}</p>
        <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
        <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
            {subText}
        </p>
      </div>
    );
}

function UtilizationBar({ label, percentage }: { label: string, percentage: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span>{label}</span>
                <span className="text-blue-400 font-mono">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}