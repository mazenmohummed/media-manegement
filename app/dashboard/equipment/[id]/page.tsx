"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AssetModal from "@/components/main/AssetModal";

interface NestedTask {
  id: string;
  taskNo?: string;
  taskType: string;
  startDate: string;
  endDate: string;
  taskNetProfit: number;
  status: string;
}

interface Asset {
  id: string;
  assetNo: string;
  assetName: string;
  category: string;
  purchaseDate: string;
  currentValue: number;
  availabilityStatus: "Available" | "On Set" | "Maintenance";
  tasks?: NestedTask[];
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const agencyId = session?.user?.agencyId || "";
  const assetId = params?.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const refreshAssetData = async () => {
    if (!agencyId || !assetId) return;
    try {
      // Re-using your robust fallback GET endpoint filter 
      const res = await fetch(`/api/assets?agencyId=${agencyId}`);
      const data = await res.json();
      const currentAsset = (data.assets || []).find((a: Asset) => a.id === assetId);
      
      if (!currentAsset) {
        console.error("Asset not found inside registry pipeline");
        return;
      }
      setAsset(currentAsset);
    } catch (err) {
      console.error("Failed to fetch detailed asset tracking parameters", err);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && agencyId && assetId) {
      refreshAssetData().finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, agencyId, assetId]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset tracking model? This is permanent.")) return;
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/equipment"); // Bounce back to inventory root registry
      }
    } catch (err) {
      console.error("Failed to delete structural asset object");
    }
  };

  // 1. CALCULATE LIFETIME YIELD FROM DEDUPLICATED CHECKS ON THIS SINGLE ASSET
  const assetLifetimeYield = useMemo(() => {
    if (!asset || !asset.tasks) return 0;
    return asset.tasks.reduce((sum, task) => sum + (task.taskNetProfit || 0), 0);
  }, [asset]);

  // 2. BREAKDOWN DEPLOYMENTS (Past vs Upcoming)
  const { upcomingTasks, pastTasks } = useMemo(() => {
    if (!asset || !asset.tasks) return { upcomingTasks: [], pastTasks: [] };
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const upcoming = asset.tasks
      .filter((t) => new Date(t.startDate) >= todayMidnight)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const past = asset.tasks
      .filter((t) => new Date(t.startDate) < todayMidnight)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return { upcomingTasks: upcoming, pastTasks: past };
  }, [asset]);

  if (status === "loading" || loading) {
    return <div className="p-8 font-black uppercase animate-pulse text-xs tracking-widest text-muted-foreground">Compiling Hardware Logs...</div>;
  }

  if (!asset) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Asset Parameters Missing</p>
        <Link href="/equipment" className="text-xs underline uppercase font-black text-muted-foreground hover:text-foreground">
          Return to Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      
      {/* BACK NAVIGATION & ACTIONS CONTROLS */}
      <div className="flex justify-between items-center border-b border-border pb-6 flex-wrap gap-4">
        <Link 
          href="/equipment" 
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
        >
          ← Return To Fleet Registry
        </Link>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="border border-border text-foreground px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all"
          >
            Modify Configurations
          </button>
          <button 
            onClick={handleDelete}
            className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
          >
            Purge From Fleet
          </button>
        </div>
      </div>

      {/* HARDWARE OVERVIEW STATUS METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-3 py-1 rounded-full tracking-widest border border-blue-500/20">
            {asset.category}
          </span>
          <h1 className="text-4xl font-black text-foreground tracking-tight uppercase italic mt-2">
            {asset.assetName}
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
            System Serial No: {asset.assetNo || `UNASSIGNED-ID-${asset.id.slice(-6)}`}
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Current Status</p>
            <p className="text-sm font-black uppercase tracking-wider text-foreground mt-1">{asset.availabilityStatus}</p>
          </div>
          <span className={`w-3 h-3 rounded-full ${
            asset.availabilityStatus === 'Available' ? 'bg-emerald-500' : 
            asset.availabilityStatus === 'On Set' ? 'bg-blue-500' : 'bg-rose-500'
          }`} />
        </div>
      </div>

      {/* METRIC ANALYSIS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-8 rounded-[2.5rem] border border-border">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-[0.2em]">Asset Valuation</p>
          <p className="text-3xl font-black font-mono tracking-tighter text-foreground">${asset.currentValue.toLocaleString()}</p>
          <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 opacity-40">Current Evaluated Capital</p>
        </div>
        <div className="bg-card p-8 rounded-[2.5rem] border border-border">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-[0.2em]">Cumulative Task Yield</p>
          <p className="text-3xl font-black font-mono tracking-tighter text-emerald-500">+${assetLifetimeYield.toLocaleString()}</p>
          <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 opacity-40">Total Pipeline Realized Net Profit</p>
        </div>
        <div className="bg-card p-8 rounded-[2.5rem] border border-border">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-[0.2em]">Deployment Runs</p>
          <p className="text-3xl font-black font-mono tracking-tighter text-blue-600">{(asset.tasks || []).length}</p>
          <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 opacity-40">Total Project Engagements</p>
        </div>
      </div>

      {/* TRACKING TIMELINES TRACKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PIPELINE / UPCOMING LOGS */}
        <div className="bg-card rounded-[2.5rem] border border-border p-8 space-y-6">
          <div className="border-b border-border pb-4 flex justify-between items-center">
            <h3 className="font-black text-blue-500 text-[10px] uppercase tracking-[0.2em]">Upcoming Pipeline Schedule</h3>
            <span className="font-mono text-[9px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-black">{upcomingTasks.length} Scheduled</span>
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest py-8 italic text-center">
              No upcoming production project requests assigned.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="bg-background p-4 rounded-2xl border border-border/80 flex justify-between items-center gap-4">
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-wide">{task.taskType}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-1 font-mono">
                      {new Date(task.startDate).toLocaleDateString()} → {new Date(task.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-black text-emerald-500">+${task.taskNetProfit.toLocaleString()}</p>
                    <span className="text-[7px] tracking-widest font-black uppercase text-blue-500">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HISTORICAL / COMPLETED DEPLOYMENTS */}
        <div className="bg-card rounded-[2.5rem] border border-border p-8 space-y-6">
          <div className="border-b border-border pb-4 flex justify-between items-center">
            <h3 className="font-black text-foreground text-[10px] uppercase tracking-[0.2em]">Historical Deployment Logs</h3>
            <span className="font-mono text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-black">{pastTasks.length} Completed</span>
          </div>

          {pastTasks.length === 0 ? (
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest py-8 italic text-center">
              No historical production tracking history recorded.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {pastTasks.map((task) => (
                <div key={task.id} className="bg-background/60 p-4 rounded-2xl border border-border/40 flex justify-between items-center gap-4 opacity-80">
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{task.taskType}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-1 font-mono">
                      {new Date(task.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-black text-muted-foreground">${task.taskNetProfit.toLocaleString()}</p>
                    <span className="text-[7px] tracking-widest font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* OVERLAY MODAL FOR DIRECT INLINE MODIFICATION */}
      <AssetModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
        }} 
        onRefresh={refreshAssetData}
        agencyId={agencyId}
        initialData={asset}
      />
    </div>
  );
}