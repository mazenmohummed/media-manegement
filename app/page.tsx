"use client";

import React from "react";

export default function AgencyHomePage() {
  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-8">
      {/* 1. WELCOME HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agency Command Center</h1>
          <p className="text-muted-foreground font-medium">
            System Status: <span className="text-green-600 font-bold">● Active</span> • Feb 15, 2026
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-100/20 flex items-center gap-2 active:scale-95">
          <span className="text-xl">+</span> New Campaign
        </button>
      </header>

      {/* 2. TOP LEVEL KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Monthly Revenue" value="$12,450" trend="+12%" emoji="💰" color="text-blue-600" />
        <SummaryCard title="Active Tasks" value="14" trend="3 Due today" emoji="🕒" color="text-foreground" />
        <SummaryCard title="Profit Margin" value="42%" trend="Healthy" emoji="📈" color="text-foreground" />
        <SummaryCard title="Deliverables" value="85%" trend="On Track" emoji="✅" color="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. RECENT ACTIVITY */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-bold text-foreground flex items-center gap-2 uppercase text-xs tracking-widest">
                📅 Critical Timelines
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <ProjectTimelineRow name="Nike Summer Shoot" client="Nike" progress={65} status="In Production" />
              <ProjectTimelineRow name="Coca Cola Blitz" client="Coke" progress={20} status="Design Phase" />
              <ProjectTimelineRow name="Adidas Reel Edit" client="Adidas" progress={90} status="Review" />
            </div>
          </div>
        </div>

        {/* 4. SIDEBAR - URGENT ALERTS */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
             <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-bold text-red-600 flex items-center gap-2 uppercase text-xs tracking-widest">
                ⚠️ Urgent Alerts
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50/50 rounded-xl text-red-800 border border-red-100 text-sm">
                <p className="font-medium text-[11px] uppercase tracking-wider mb-1 opacity-70">Task Stall</p>
                Ahmed hasn't updated <span className="font-bold">Reels</span> task today.
              </div>
              <div className="p-4 bg-orange-50/50 rounded-xl text-orange-800 border border-orange-100 text-sm">
                <p className="font-medium text-[11px] uppercase tracking-wider mb-1 opacity-70">Billing Delay</p>
                Invoice #1042 for <span className="font-bold">Nike</span> is overdue.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, trend, emoji, color }: any) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="text-xl p-2.5 bg-muted rounded-xl group-hover:scale-110 transition-transform">{emoji}</div>
        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-tighter">{trend}</span>
      </div>
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em]">{title}</p>
      <p className={`text-3xl font-black mt-1 tracking-tight ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function ProjectTimelineRow({ name, client, progress, status }: any) {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">{name}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{client} • {status}</p>
        </div>
        <p className="text-xs font-mono font-bold text-foreground">{progress}%</p>
      </div>
      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}