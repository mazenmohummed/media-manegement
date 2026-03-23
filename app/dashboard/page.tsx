"use client";
import React from "react";
import { 
  Activity, 
  BarChart3, 
  Box, 
  Briefcase, 
  DollarSign, 
  Users, 
  Plus,
  LayoutDashboard
} from "lucide-react"; // npm install lucide-react

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex">
    
      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 space-y-10">
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Command Center</h1>
            <p className="text-muted-foreground text-sm font-medium">System status: All production pipelines active.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
            <Plus size={14} strokeWidth={3} /> New Deployment
          </button>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Revenue" value="$124,500" change="+12.5%" icon={<DollarSign className="text-blue-600" />} />
          <StatCard title="Active Projects" value="14" change="+2" icon={<Briefcase className="text-blue-600" />} />
          <StatCard title="Ops Efficiency" value="94.2%" change="-1.4%" icon={<Activity className="text-blue-600" />} />
          <StatCard title="Asset Load" value="78%" change="+5%" icon={<Box className="text-blue-600" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* PROJECT PIPELINE */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground border-b border-border pb-4">Live Pipeline</h3>
            <div className="space-y-4">
              <ProjectRow name="Red Bull Commercial" client="Red Bull" status="Production" progress={65} value="$12,000" />
              <ProjectRow name="Tech-X Brand Identity" client="Tech-X" status="Review" progress={90} value="$4,500" />
              <ProjectRow name="Summer Fest 2026" client="City Council" status="Briefing" progress={15} value="$28,000" />
            </div>
          </div>

          {/* RECENT ASSET LOGS */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground border-b border-border pb-4">Asset Status</h3>
            <div className="bg-card/50 border border-border rounded-[2rem] p-6 space-y-6">
              <AssetStatus name="ARRI Alexa 35" status="Deployed" user="Ahmed K." color="bg-red-500" />
              <AssetStatus name="Sony A7S III" status="In House" user="Available" color="bg-emerald-500" />
              <AssetStatus name="DJI Ronin 4D" status="Maintenance" user="Technical" color="bg-amber-500" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// SUB-COMPONENTS
function NavItem({ icon, label, active = false }: any) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StatCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-[2rem] space-y-4">
      <div className="flex justify-between items-center">
        <div className="p-2 bg-blue-600/10 rounded-lg">{icon}</div>
        <span className={`text-[10px] font-black ${change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{change}</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black tracking-tighter italic">{value}</h4>
      </div>
    </div>
  );
}

function ProjectRow({ name, client, status, progress, value }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-[2rem] flex items-center justify-between hover:border-blue-600/30 transition-all group">
      <div className="space-y-1">
        <h4 className="font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">{name}</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{client} • {value}</p>
      </div>
      <div className="flex items-center gap-8">
        <div className="hidden md:block w-32 space-y-2">
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full text-[8px] font-black text-blue-600 uppercase tracking-widest">
          {status}
        </div>
      </div>
    </div>
  );
}

function AssetStatus({ name, status, user, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-xs font-black uppercase tracking-tight">{name}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{user}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
        <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">{status}</span>
      </div>
    </div>
  );
}