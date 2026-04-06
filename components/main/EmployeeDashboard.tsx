"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Briefcase, CheckSquare, TrendingUp, 
  DollarSign, MapPin, Bell, Edit3, ShieldCheck, 
  Clock, Zap
} from "lucide-react";
import EditAgencyModal from "../../components/main/EditAgencyModal"; // Ensure path is correct
import PerformanceTable from "./employees/PerformanceTable";

export default function EmployeeDashboard({ user }: { user: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Guard: If session hasn't loaded yet
  if (!user) {
    return <div className="p-20 text-center font-black">UNAUTHORIZED ACCESS</div>;
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
  
  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Dashboard fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">LOADING TERMINAL...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 min-h-screen bg-background">
      
      {/* 1. NOTIFICATION BAR */}
      <section className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center gap-4">
        <Bell className="text-primary animate-bounce" size={20} />
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Priority Briefing</p>
          <div className="flex gap-6 overflow-x-auto no-scrollbar py-1">
             {data.notifications?.map((n: any) => (
               <span key={n.id} className="text-xs font-bold whitespace-nowrap">
                 • {n.title}: <span className="font-normal opacity-70">{n.message}</span>
               </span>
             ))}
             {(!data.notifications || data.notifications.length === 0) && (
               <span className="text-xs opacity-50">No urgent tasks for today.</span>
             )}
          </div>
        </div>
      </section>

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">
            {isAdmin ? "Agency Command" : "Unit Dashboard"}
          </h1>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-black text-[10px] uppercase hover:bg-primary transition-colors"
          >
            <Edit3 size={14}/> Edit Agency
          </button>
        )}
      </header>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<Users/>} label="Clients" value={data.stats.totalClients} />
        <StatCard icon={<Briefcase/>} label="Projects" value={data.stats.totalProjects} />
        <StatCard icon={<CheckSquare/>} label="Active Tasks" value={data.stats.totalTasks} />
        <StatCard 
          icon={isAdmin ? <TrendingUp/> : <Zap/>} 
          label={isAdmin ? "Gross Revenue" : "Efficiency"} 
          value={isAdmin ? `$${data.stats.netProfit}` : `${(data.stats.efficiencyRate * 100).toFixed(1)}%`}
          color="text-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {isAdmin ? (
            <section className="bg-card border border-border p-8 rounded-[3rem] shadow-xl">
  <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
    <DollarSign size={14} className="text-primary"/> Financial Performance
  </h3>
  
  {/* Changed to 3 columns on mobile, 5 on medium screens */}
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    <MiniFinance label="Revenue" value={`$${data.stats.revenue}`} />
    
    {/* New breakdown fields */}
    <MiniFinance label="Total Payouts" value={`$${data.stats.totalPayouts}`} />
    <MiniFinance label="Tasks Expenses" value={`$${data.stats.totalTaskExpenses}`} />
    
    {/* Total Expenses (Payouts + Rentals) */}
    <MiniFinance 
      label="Total Expenses" 
      value={`$${data.stats.expenses}`} 
      color="text-rose-500" 
    />
    <MiniFinance 
      label="Total Salary" 
      value={`$${data.stats.totalUserSalary}`} 
      color="text-rose-500" 
    />
    
    <MiniFinance label="Margin" value={`${data.stats.avgMargin}%`} />
  </div>
</section>
          ) : (
            <section className="bg-card border border-border p-8 rounded-[3rem] shadow-xl">
               <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <DollarSign size={14} className="text-primary"/> Compensation & Payouts
              </h3>
              <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black opacity-50 uppercase">Pending Payout</p>
                  <p className="text-4xl font-black italic">${data.stats.totalPayouts}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black opacity-50 uppercase">Hours Logged</p>
                  <p className="text-2xl font-black">{data.stats.totalWorkingHours}h</p>
                </div>
              </div>
            </section>
          )}

        
            
          {/* 3. VERIFIED LOCATION NODE */}
            <section className="bg-foreground text-background p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                    Verified Office Node
                </h4>
                <p className="text-2xl font-black italic leading-tight">
                    {/* Priority 1: Physical Address */}
                    {data.address ? (
                    data.address
                    ) : data.latitude && data.longitude ? (
                    /* Priority 2: GPS Coordinates if address is null */
                    <span className="font-mono text-lg uppercase tracking-tighter">
                        {data.latitude && (
                    <a 
                      href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`} 
                      target="_blank" 
                      className="text-[14px] font-bold text-blue-500 underline mt-1 block"
                    >
                      VIEW ON GOOGLE MAPS
                    </a>
                  )}
                    </span>
                    ) : (
                    /* Priority 3: Fallback */
                    "No Location Set"
                    )}
                </p>
                
                {data.radius && (
                    <div className="mt-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <p className="text-[10px] font-black  uppercase tracking-widest">
                        Geofence Active: {data.radius}m
                    </p>
                    </div>
                )}
                </div>
                <MapPin size={40} className="opacity-10 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12" />
            </div>
            
            {/* Modern Glow Effect */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] -mr-20 -mt-20"></div>
            </section>
        </div>

        <div className="space-y-8">
          {isAdmin && (
            <section className="bg-foreground text-background p-8 rounded-[3rem] shadow-xl border border-primary/20 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all"></div>
                <ShieldCheck className="mb-4 text-primary" size={24} />
                <h3 className="text-xl font-black uppercase italic tracking-tighter relative z-10">Bundle Status</h3>
                <div className="mt-2 flex items-center gap-2 relative z-10">
                    <span className="bg-primary text-primary-foreground text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Active Plan</span>
                    <p className="text-[10px] font-black uppercase opacity-80">{data.subscription?.plan || "Free"} Node</p>
                </div>
            </section>
          )}
          
          <section className="bg-card border border-border p-8 rounded-[3rem]">
             <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Clock-in Summary</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-60 font-bold">Total Working Hours</span>
                  <span className="text-sm font-black">{data.stats.totalWorkingHours} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-60 font-bold">Late Arrivals</span>
                  <span className="text-sm font-black text-orange-500">{data.stats.lateCount}</span>
                </div>
             </div>
          </section>
        </div>
      </div>

      {/* RENDER MODAL ONLY WHEN DATA IS READY */}
      {isAdmin && data && (
        <EditAgencyModal 
          agency={data} 
          isOpen={isEditOpen} 
          onClose={() => setIsEditOpen(false)} 
          onRefresh={fetchDashboard} 
        />
      )}

      {/* 4. PERFORMANCE & LOGISTICS */}
      {isAdmin && data.employeePerformance && (
        <PerformanceTable performanceData={data.employeePerformance} />
      )}
        {/* 4. OPERATIONAL UPTIME (WORKING HOURS) */}
        <section className="bg-card border border-border p-8 rounded-[3rem] shadow-xl">
        <div className="flex items-center justify-between mb-8">
            <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-primary"/> Operational Uptime
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase mt-1">Node Schedule • Cairo/Egypt Timezone</p>
            </div>
            
            {/* Logic to show "LIVE" status if within working hours */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">System Online</span>
            </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {data.workingHours?.map((wh: any) => (
            <div 
                key={wh.day} 
                className={`p-4 rounded-2xl border transition-all duration-500 ${
                wh.isClosed 
                    ? "bg-muted/10 border-border/20 grayscale" 
                    : "bg-muted/30 border-border/50 hover:border-primary/40 hover:bg-muted/50 shadow-sm"
                }`}
            >
                <p className="text-[9px] font-black uppercase mb-3 tracking-tighter opacity-50">
                {wh.day.substring(0, 3)}
                </p>
                
                {!wh.isClosed ? (
                <div className="space-y-1">
                    <p className="text-xs font-black italic tabular-nums">{wh.openTime}</p>
                    <div className="h-[1px] w-4 bg-primary/20" />
                    <p className="text-xs font-black italic tabular-nums">{wh.closeTime}</p>
                </div>
                ) : (
                <div className="flex flex-col h-full justify-center">
                    <p className="text-[9px] font-black text-rose-500/60 uppercase italic tracking-widest">
                    Offline
                    </p>
                </div>
                )}
            </div>
            ))}
        </div>
        </section>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-foreground" }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all group">
      <div className="flex items-center gap-3 mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
        {React.cloneElement(icon, { size: 16 })}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-3xl font-black italic ${color}`}>{value}</p>
    </div>
  );
}

function MiniFinance({ label, value, color = "text-foreground", highlight = false }: any) {
  return (
    <div className={`p-4 rounded-2xl transition-all ${highlight ? "bg-primary text-white" : "bg-muted/50 hover:bg-muted/80"}`}>
      <p className="text-[8px] font-black uppercase opacity-60">{label}</p>
      <p className={`text-sm font-black italic ${color}`}>{value}</p>
    </div>
  );
}