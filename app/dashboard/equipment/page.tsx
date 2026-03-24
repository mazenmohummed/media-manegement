"use client";

import React, { useEffect, useState, useMemo } from "react";
import AddAssetModal from "@/components/main/AddAssetModal";
import AssetModal from "@/components/main/AssetModal";
import { useSession } from "next-auth/react"; // 1. Import useSession

interface Asset {
  id: string;
  assetNo: string;
  assetName: string;
  category: string;
  purchaseDate: string;
  currentValue: number;
  availabilityStatus: "Available" | "On Set" | "Maintenance";
  tasks?: any[];
}

// --- SUB-COMPONENTS ---

interface MetricCardProps {
  title: string;
  value: string;
  label: string;
  color?: string;
}

function MetricCard({ title, value, label, color = "text-foreground" }: MetricCardProps) {
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
      <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-[0.2em]">{title}</p>
      <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
      <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 opacity-40">{label}</p>
    </div>
  );
}

interface UtilBarProps {
  label: string;
  percentage: number;
}

function UtilBar({ label, percentage }: UtilBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-blue-400">{percentage}%</span>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-500" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  // 2. Extract session data
  const { data: session, status } = useSession();
  
  // 3. Get agencyId dynamically (defaults to empty string while loading)
  const agencyId = session?.user?.agencyId || "";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [metrics, setMetrics] = useState({ totalInvestment: 0, currentValue: 0, depreciation: 0 });
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    if (!agencyId) return; // Don't fetch if we don't have an ID
    const res = await fetch(`/api/assets?agencyId=${agencyId}`);
    const data = await res.json();
    setAssets(data.assets || []);
    setMetrics(data.metrics || { totalInvestment: 0, currentValue: 0, depreciation: 0 });
  };

  useEffect(() => {
    if (status === "authenticated" && agencyId) {
      refreshData().finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, agencyId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This action is permanent.")) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (res.ok) refreshData();
    } catch (err) {
      console.error("Failed to delete asset");
    }
  };

  const filteredInventory = useMemo(() => {
    return activeCategory === "ALL" 
      ? assets 
      : assets.filter(item => item.category === activeCategory);
  }, [activeCategory, assets]);

  // Auth/Loading Guard
  if (status === "loading" || loading) {
    return <div className="p-8 font-black uppercase animate-pulse">Synchronizing Inventory...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase italic">Asset Inventory</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em] mt-1">Hardware & Capital Management</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-xl border border-border overflow-x-auto">
          {["ALL", "Camera", "Computing", "Lighting", "Audio"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeCategory === cat ? "bg-background text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* METRICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Investment" value={`$${metrics.totalInvestment.toLocaleString()}`} label="Initial Capital" />
        <MetricCard title="Net Asset Value" value={`$${metrics.currentValue.toLocaleString()}`} label="Current Portfolio" color="text-blue-600" />
        <MetricCard title="Depreciation" value={`-$${metrics.depreciation.toLocaleString()}`} label="Value Lost" color="text-rose-500" />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-black text-foreground text-[10px] uppercase tracking-[0.2em]">Master Asset Registry</h3>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-foreground text-background px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[0.98] transition-all"
            >
                + Register New Asset
            </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5">
                    <tr>
                        <th className="p-6 font-black">Asset Details</th>
                        <th className="p-6 font-black">Category</th>
                        <th className="p-6 font-black">Status</th>
                        <th className="p-6 text-right font-black">Valuation</th>
                        <th className="p-6 text-right font-black">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                            <td className="p-6">
                                <p className="font-black text-foreground text-sm uppercase group-hover:text-blue-600 transition-colors">
                                    {item.assetName}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-mono uppercase">{item.assetNo || `ID-${item.id.slice(-4)}`}</p>
                            </td>
                            <td className="p-6">
                                <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md border border-border">
                                    {item.category}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                        item.availabilityStatus === 'Available' ? 'bg-emerald-500' : 
                                        item.availabilityStatus === 'On Set' ? 'bg-blue-500' : 'bg-rose-500'
                                    }`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                        {item.availabilityStatus}
                                    </p>
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <p className="font-mono font-black text-sm text-foreground">${item.currentValue.toLocaleString()}</p>
                                <p className="text-[9px] text-rose-500 font-black uppercase">Current Value</p>
                            </td>
                            <td className="p-6 text-right">
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => {
                                            setSelectedAsset(item);
                                            setIsEditModalOpen(true); 
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(item.id)}
                                      className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                                    >
                                      Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODALS SECTION (Outside Table) */}
      <AddAssetModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onRefresh={refreshData}
          agencyId={agencyId}
      />

      {selectedAsset && (
        <AssetModal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAsset(null);
          }} 
          onRefresh={refreshData}
          agencyId={agencyId}
          initialData={selectedAsset}
        />
      )}

      {/* UTILIZATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white">
              <h4 className="font-black text-blue-400 uppercase text-[9px] tracking-[0.3em] mb-8">Hardware Utilization</h4>
              <div className="space-y-8">
                  <UtilBar label="Cinema Cameras" percentage={78} />
                  <UtilBar label="Edit Suites" percentage={92} />
                  <UtilBar label="Lighting Kits" percentage={45} />
              </div>
          </div>
          <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white flex flex-col justify-between">
              <p className="font-black uppercase text-[10px] tracking-widest opacity-80">Maintenance Alert</p>
              <p className="text-2xl font-black leading-tight mt-4 italic">
                3 Assets require routine sensor cleaning this week.
              </p>
              <button className="mt-8 bg-white text-blue-600 w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all">
                Schedule Service
              </button>
          </div>
      </div>
    </div>
  );
}

// Sub-components kept as they were...