"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  TrendingUp, 
  Zap, 
  CreditCard, 
  Loader2,
  DollarSign,
  BarChart3,
  X,
  History,
  Search,
  SlidersHorizontal,
  Calendar
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  userType: "FULL_TIME" | "PART_TIME" | "FREELANCER" | "INTERN";
  totalTaskRevenue: number;
  netProfitGenerated: number;
  totalPaidToDate: number;
  efficiencyRate: string;
  salary: number;
  tasks?: Array<{
    id: string;
    revenue: number;
    taskNetProfit: number;
    date: string;
  }>;
}

interface ApiMetrics {
  totalRevenue: number;
  totalPayouts: number;
  globalEfficiency: string;
  avgRevenuePerHead: number;
  employeeCount: number;
}

interface PersonnelData {
  employees: Employee[];
  metrics: ApiMetrics;
}

export default function EmployeeFinancePage() {
  const router = useRouter();
  const [data, setData] = useState<PersonnelData | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── FILTER STATES ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    category: "Salary",
    status: "PAID",
    date: new Date().toISOString().split('T')[0]
  });
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [personnelRes, historyRes] = await Promise.all([
        fetch("/api/finance/personnel"),
        fetch("/api/finance/payouts")
      ]);

      if (!personnelRes.ok || !historyRes.ok) {
        throw new Error("Failed to pull payroll records.");
      }

      const personnelJson = await personnelRes.json();
      const historyJson = await historyRes.json();

      setData(personnelJson);
      setPayoutHistory(historyJson);
    } catch (err) {
      console.error("Finance Page Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []); 

  const refreshFinancials = async () => {
    try {
      const [personnelRes, historyRes] = await Promise.all([
        fetch("/api/finance/personnel"),
        fetch("/api/finance/payouts")
      ]);
      const personnelJson = await personnelRes.json();
      const historyJson = await historyRes.json();
      setData(personnelJson);
      setPayoutHistory(historyJson);
    } catch (err) {
      console.error("Sync Failure:", err);
    }
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setIsProcessing(true);

    const selectedEmployee = data.employees.find((emp) => emp.id === formData.employeeId);

    const payload = {
      employeeId: formData.employeeId,
      resourceName: selectedEmployee?.name || "Staff Payout",
      category: formData.category,
      amount: formData.amount,
      status: formData.status,
      date: formData.date,
    };

    try {
      const res = await fetch("/api/finance/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await refreshFinancials(); 
        setIsModalOpen(false);
        setFormData({ ...formData, amount: "", employeeId: "" });
      }
    } catch (err) {
      alert("Failed to submit payout entry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── DYNAMIC DATE & STRING FILTER PIPELINE ─────────────────────────────────
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    
    const hasDateFilter = startDate || endDate;

    return data.employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || emp.userType === typeFilter;
      return matchesSearch && matchesType;
    }).map((emp) => {
      // Isolate payouts tied to this specific employee within the current date parameters
      const relevantPayouts = payoutHistory.filter((payout) => {
        if (payout.employeeId !== emp.id) return false;
        
        const txTime = new Date(payout.date || payout.createdAt).getTime();
        const startThreshold = startDate ? new Date(startDate).getTime() : null;
        const endThreshold = endDate ? new Date(endDate).getTime() : null;
        
        const matchesStart = startThreshold ? txTime >= startThreshold : true;
        const matchesEnd = endThreshold ? txTime <= endThreshold + 86400000 : true;
        
        return matchesStart && matchesEnd;
      });

      const dynamicPaidToDate = relevantPayouts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      
      // Filter tasks within selection parameters
      const employeeTasks = emp.tasks || []; 
      const relevantTasks = employeeTasks.filter((task: any) => {
        if (!hasDateFilter) return true;
        const taskTime = new Date(task.date).getTime();
        const startThreshold = startDate ? new Date(startDate).getTime() : null;
        const endThreshold = endDate ? new Date(endDate).getTime() : null;
        
        const matchesStart = startThreshold ? taskTime >= startThreshold : true;
        const matchesEnd = endThreshold ? taskTime <= endThreshold + 86400000 : true;
        
        return matchesStart && matchesEnd;
      });

      // Calculate dynamic framework metrics
      const dynamicRevenue = hasDateFilter 
        ? relevantTasks.reduce((sum: number, task: any) => sum + Number(task.revenue || 0), 0)
        : emp.totalTaskRevenue;

      const dynamicNetProfit = hasDateFilter
        ? relevantTasks.reduce((sum: number, task: any) => sum + Number(task.taskNetProfit || 0), 0)
        : emp.netProfitGenerated;
      
      // Determine Remaining Owed Balances
      let upcomingPayout = 0;
      if (emp.userType === "FREELANCER") {
        // Freelancers scale directly to dynamic revenue parameters
        upcomingPayout = Math.max(0, dynamicRevenue - dynamicPaidToDate);
      } else {
        // Regular staff ignore timeline thresholds to maintain fixed base contract visibility
        upcomingPayout = Math.max(0, emp.salary - emp.totalPaidToDate);
      }

      return {
        ...emp,
        dynamicPaidToDate: hasDateFilter ? dynamicPaidToDate : emp.totalPaidToDate,
        upcomingPayout,
        dynamicNetProfit,
        dynamicRevenue
      };
    });
  }, [data, searchQuery, typeFilter, payoutHistory, startDate, endDate]);

  const filteredPayoutHistory = useMemo(() => {
    return payoutHistory.filter((item) => {
      const correspondingEmployee = data?.employees.find(e => e.id === item.employeeId);
      
      const recipientName = item.resourceName || correspondingEmployee?.name || "";
      const matchesSearch = recipientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || correspondingEmployee?.userType === typeFilter;
      
      const txTime = new Date(item.date || item.createdAt).getTime();
      const startThreshold = startDate ? new Date(startDate).getTime() : null;
      const endThreshold = endDate ? new Date(endDate).getTime() : null;
      
      const matchesStart = startThreshold ? txTime >= startThreshold : true;
      const matchesEnd = endThreshold ? txTime <= endThreshold + 86400000 : true;

      return matchesSearch && matchesType && matchesStart && matchesEnd;
    });
  }, [payoutHistory, data, searchQuery, typeFilter, startDate, endDate]);

  // ── REACTIVE METRICS METRIC CORES ──────────────────────────────────────────
  const dynamicTotalRevenue = useMemo(() => {
    return filteredEmployees.reduce((sum, e) => sum + (e.dynamicRevenue ?? e.totalTaskRevenue), 0);
  }, [filteredEmployees]);

  const totalMonthlyLiability = useMemo(() => {
    return filteredEmployees.reduce((acc, emp) => {
      const payout = emp.userType === "FREELANCER" 
        ? (emp.dynamicRevenue ?? emp.totalTaskRevenue) 
        : emp.salary;
      return acc + payout;
    }, 0);
  }, [filteredEmployees]);

  const netAgencyProfit = useMemo(() => {
    return filteredEmployees.reduce((sum, e) => sum + e.dynamicNetProfit, 0);
  }, [filteredEmployees]);

  const livePayoutsTotal = useMemo(() => {
    return filteredPayoutHistory.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [filteredPayoutHistory]);

  const dynamicAvgRevenuePerHead = useMemo(() => {
    return filteredEmployees.length > 0 ? (dynamicTotalRevenue / filteredEmployees.length) : 0;
  }, [filteredEmployees, dynamicTotalRevenue]);

  const dynamicGlobalEfficiency = useMemo(() => {
    return totalMonthlyLiability > 0 ? (dynamicTotalRevenue / totalMonthlyLiability).toFixed(2) : "0.00";
  }, [dynamicTotalRevenue, totalMonthlyLiability]);


  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="animate-spin text-rose-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">
          Analyzing Agency Accounts...
        </p>
      </div>
    );
  }

  if (!data || !data.employees) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-rose-600 font-black uppercase italic text-2xl">No Data Found</h2>
        <p className="text-muted-foreground font-mono text-xs mt-2">EMPTY_DATABASE_RECORD_SET</p>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={14} className="text-rose-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Payroll Ledger</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Personnel <span className="text-rose-600">Finance</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Liability</p>
            <p className="text-2xl font-black font-mono text-rose-600 italic">
              ${totalMonthlyLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all cursor-pointer"
          >
            Process Payout
          </button>
        </div>
      </header>

      {/* FILTER CONTROLS HUB */}
      <div className="bg-card border border-border p-5 rounded-3xl shadow-sm grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
        <div className="relative group">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-rose-600 transition-colors" />
          <input 
            type="text"
            placeholder="Search resources or roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-rose-500/50 focus:bg-background transition-all"
          />
        </div>

        <div className="relative">
          <SlidersHorizontal size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-rose-500/50 focus:bg-background transition-all appearance-none cursor-pointer"
          >
            <option value="">All Contract Classifications</option>
            <option value="FULL_TIME">Full Time Staff</option>
            <option value="PART_TIME">Part Time Staff</option>
            <option value="FREELANCER">External Freelancers</option>
            <option value="INTERN">Intern Resources</option>
          </select>
        </div>

        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-rose-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>

        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-rose-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>
      </div>

      {/* CORE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <EmployeeStatCard label="Total Revenue" value={`$${dynamicTotalRevenue.toLocaleString()}`} sub="Gross Account Value" color="emerald" icon={<DollarSign size={18}/>} />
        <EmployeeStatCard label="Net Agency Profit" value={`$${netAgencyProfit.toLocaleString()}`} sub="Post-Overhead Margin" color="blue" icon={<BarChart3 size={18}/>} />
        <EmployeeStatCard label="Total Payouts Done" value={`$${livePayoutsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Filtered Ledger Payouts" color="rose" icon={<CreditCard size={18}/>} />
        <EmployeeStatCard label="Revenue per Head" value={`$${Math.round(dynamicAvgRevenuePerHead).toLocaleString()}`} sub="Resource Production Average" color="emerald" icon={<TrendingUp size={18}/>} />
        <EmployeeStatCard label="Avg. Efficiency" value={`${dynamicGlobalEfficiency}x`} sub="Yield Ratio" color="blue" icon={<Zap size={18}/>} />
      </div>

      {/* TABLE 1: PROFITABILITY & REMAINING BALANCES */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 italic">Personnel Profitability Balance</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-8">Team Member</th>
                <th className="p-8">Type</th>
                <th className="p-8">Owed / Remaining Balance</th>
                <th className="p-8">Net Profit Generated</th>
                <th className="p-8">Total Payouts Done</th>
                <th className="p-8 text-right">Performance Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center uppercase tracking-widest text-[10px] font-bold text-muted-foreground/40 italic">
                    No team members correspond with current filter configurations.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  return (
                    <tr key={emp.id} onClick={() => router.push(`/dashboard/employees/${emp.id}`)} className="group hover:bg-muted/30 transition-all cursor-pointer border-l-4 border-transparent hover:border-rose-600">
                      <td className="p-8">
                        <div className="flex flex-col">
                          <p className="font-black text-sm uppercase tracking-tight italic text-foreground group-hover:text-rose-600 transition-colors">{emp.name}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{emp.role}</p>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                          emp.userType === "FREELANCER" ? "border-amber-500/50 text-amber-500 bg-amber-500/5" : "border-blue-500/50 text-blue-500 bg-blue-500/5"
                        }`}>
                          {emp.userType?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-8 text-rose-500 font-black">${emp.upcomingPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`p-8 font-black ${emp.dynamicNetProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        ${emp.dynamicNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-8 text-blue-500 font-black">${emp.dynamicPaidToDate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-8 text-right">
                        <div className="inline-block px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-black uppercase italic transition-transform group-hover:scale-110">
                          {emp.efficiencyRate}x ROI
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TABLE 2: HISTORICAL PAYOUTS TRANSACTION LOG */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-2">
            <History size={12} className="text-muted-foreground" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Payouts Transaction History Ledger</h2>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-6 pl-8">Transaction Date</th>
                <th className="p-6">Recipient</th>
                <th className="p-6">Allocation Type</th>
                <th className="p-6">Status</th>
                <th className="p-6 pr-8 text-right">Disbursed Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs text-muted-foreground">
              {filteredPayoutHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center uppercase tracking-widest text-[10px] font-bold text-muted-foreground/40 italic">
                    No recorded payouts found inside target filters.
                  </td>
                </tr>
              ) : (
                filteredPayoutHistory.map((item: any) => {
                  const matchingEmployee = data?.employees.find(e => e.id === item.employeeId);
                  const displayRecipient = matchingEmployee?.name || item.resourceName || "Staff Member";

                  return (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-6 pl-8 font-bold text-foreground">
                        {new Date(item.date || item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-6 font-black uppercase tracking-tight text-foreground italic">
                        {displayRecipient}
                      </td>
                      <td className="p-6">
                        <span className="px-2 py-0.5 rounded border border-border bg-muted/30 text-[9px] font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-widest">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {item.status || "PAID"}
                        </span>
                      </td>
                      <td className="p-6 pr-8 text-right font-black text-sm text-foreground">
                        ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Log <span className="text-rose-600">Payout</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full text-foreground cursor-pointer"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreatePayout} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Resource Name</label>
                <select 
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold focus:ring-2 ring-rose-600 outline-none text-foreground"
                >
                  <option value="">Select Employee...</option>
                  {data?.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Amount ($)</label>
                  <input 
                    type="number" step="0.01" required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-mono font-black text-foreground outline-none focus:ring-2 ring-rose-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold text-foreground outline-none"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Commission">Commission</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Transaction Date</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold text-foreground outline-none"
                />
              </div>

              <button className="w-full bg-rose-600 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 cursor-pointer">
                {isProcessing ? "Recording..." : "Finalize Outflow Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeStatCard({ label, value, sub, color, icon }: any) {
  const themes: any = {
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/20",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20"
  };

  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border flex justify-between items-start group hover:border-foreground/10 transition-all">
      <div>
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[7px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl border ${themes[color]}`}>{icon}</div>
    </div>
  );
}