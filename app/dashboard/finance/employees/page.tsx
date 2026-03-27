"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  TrendingUp, 
  Zap, 
  CreditCard, 
  Activity,
  Loader2,
  DollarSign,
  BarChart3,
  Plus,
  X
} from "lucide-react";

export default function EmployeeFinancePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    category: "Salary",
    status: "PAID",
    date: new Date().toISOString().split('T')[0]
  });
  
  // Initial Data Fetch
  useEffect(() => {
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [personnelRes, historyRes] = await Promise.all([
        fetch("/api/finance/personnel"),
        fetch("/api/finance/payouts")
      ]);

      if (!personnelRes.ok || !historyRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const personnelJson = await personnelRes.json();
      const historyJson = await historyRes.json();

      // LOG HERE: This will show in your Browser Console
      console.log("Personnel Data:", personnelJson);
      console.log("Payout History:", historyJson);

      setData(personnelJson);
      setPayoutHistory(historyJson);
    } catch (err) {
      console.error("Finance Page Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  loadInitialData();
}, []); 

  const fetchData = async () => {
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
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const selectedEmployee = data.employees.find((emp: any) => emp.id === formData.employeeId);

    const payload = {
      employeeId: formData.employeeId, // The ID from your <select>
      resourceName: selectedEmployee?.name || "Unknown Resource",
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
        // Re-fetch both personnel data and history to update the "Upcoming Payout" values
        await fetchData(); 
        setIsModalOpen(false);
        setFormData({ ...formData, amount: "", employeeId: "" });
      }
    } catch (err) {
      alert("Failed to record expense.");
    } finally {
      setIsProcessing(false);
    }
  };
  // Helper to calculate what an employee is "owed" before payouts
  const calculateGrossLiability = (emp: any) => {
    if (emp.userType === "FREELANCER") {
      // For freelancers, we sum the grossRevenue from their assigned tasks
      return emp.tasks?.reduce((sum: number, task: any) => sum + (task.grossRevenue || 0), 0) || 0;
    }
    // For FULL_TIME or PART_TIME, use their base salary
    return emp.salary || 0;
  };

 

  
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="animate-spin text-rose-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">
          Calculating Payouts...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-rose-600 font-black uppercase italic text-2xl">Access Denied</h2>
        <p className="text-muted-foreground font-mono text-xs mt-2">DATABASE_CONNECTION_REFUSED</p>
      </div>
    );
  }

  // --- BUSINESS LOGIC ---
  const totalMonthlyLiability = data.employees.reduce((acc: number, emp: any) => {
  // Logic: Use totalTaskRevenue for freelancers, salary for others
  const payout = emp.userType === "FREELANCER" ? (emp.totalTaskRevenue || 0) : (emp.salary || 0);
  return acc + payout;
  }, 0);

  const totalRevenueGenerated = data.employees.reduce((acc: number, emp: any) => 
    acc + (emp.totalTaskRevenue || 0), 0
  );
  const netAgencyProfit = totalRevenueGenerated - totalMonthlyLiability;

  console.log(data)

  return (
    <div className="p-10 space-y-10 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={14} className="text-rose-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Payroll & Performance ROI</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Personnel <span className="text-rose-600">Finance</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Dynamic Liability</p>
            <p className="text-2xl font-black font-mono text-rose-600 italic">
              ${totalMonthlyLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={isProcessing}
            className="bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Process Payout</span>
          </button>
        </div>
      </header>

      {/* --- ADD PAYOUT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Record <span className="text-rose-600">Expense</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreatePayout} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Personnel Resource</label>
                <select 
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold focus:ring-2 ring-rose-600 outline-none"
                >
                  <option value="">Select Employee...</option>
                  {data.employees.map((emp: any) => (
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
                    placeholder="0.00"
                    className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-mono font-black outline-none focus:ring-2 ring-rose-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold outline-none"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Commission">Commission</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Transaction Date</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-muted/50 border border-border p-3 rounded-xl text-sm font-bold outline-none"
                />
              </div>

              <button 
                disabled={isProcessing}
                className="w-full bg-rose-600 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isProcessing ? "Recording..." : "Finalize Expense Record"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CORE METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <EmployeeStatCard label="Total Revenue Generated" value={`$${totalRevenueGenerated.toLocaleString()}`} sub="Gross Agency Income" color="emerald" icon={<DollarSign size={18}/>} />
        <EmployeeStatCard label="Net Agency Profit" value={`$${netAgencyProfit.toLocaleString()}`} sub="Post-Payroll Margin" color="blue" icon={<BarChart3 size={18}/>} />
        <EmployeeStatCard label="Total Payouts" value={`$${totalMonthlyLiability.toLocaleString()}`} sub="Staff & Freelance Cost" color="rose" icon={<CreditCard size={18}/>} />
        <EmployeeStatCard label="Revenue per Head" value={`$${Math.round(data.metrics.avgRevenuePerHead).toLocaleString()}`} sub="Avg. Monthly Generation" color="emerald" icon={<TrendingUp size={18}/>} />
        <EmployeeStatCard label="Avg. Efficiency" value={data.metrics.globalEfficiency} sub="Revenue to Cost Ratio" color="blue" icon={<Zap size={18}/>} />
      </div>

      {/* EMPLOYEE LEDGER TABLE */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 italic">Personnel Profitability</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-8">Team Member</th>
                <th className="p-8">Type</th>
                <th className="p-8">Upcoming Payout</th>
                <th className="p-8">Revenue Generated</th>
                <th className="p-8">Net Profit</th>
                <th className="p-8 text-right">Performance</th>
              </tr>
            </thead>
           <tbody className="divide-y divide-border font-mono text-sm">
             {data.employees.map((emp: any) => {
              // 1. Get revenue from the correct k

              
              const netProfitValue = emp.totalNetProfit || 0;
              const revenueValue = emp.totalTaskRevenue || 0;
              const totalTaskRevenue = emp.tasks?.reduce((sum: number, task: any) => {
                // Only count revenue from completed tasks (optional, depending on your business logic)
                if (task.status === "COMPLETED") {
                  return sum + (task.grossRevenue || 0);
                }
                return sum;
              }, 0) || 0;

              const grossOwed = emp.userType === "FREELANCER"
              ? totalTaskRevenue   // ✅ Freelancer يتحسب من Revenue
              : (emp.salary || 0);           // ✅ Staff يتحسب من Salary

              const totalPaidToDate = payoutHistory
              .filter((log) => log.resourceName === emp.name || log.resourceName.includes(emp.name))
              .reduce((sum, log) => sum + (log.amount || 0), 0);


              const upcomingPayout = grossOwed - totalPaidToDate
              const employeeNet = revenueValue - grossOwed;

              return (
                <EmployeeRow 
                  key={emp.id}
                  name={emp.name} 
                  role={emp.role} 
                  userType={emp.userType}
                  payout={`$${upcomingPayout.toLocaleString()}`} 
                  revenue={`$${revenueValue}`} 
                  netProfit={`$${netProfitValue}`}
                  efficiency={emp.efficiencyRate || "0.0"} 
                  onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                />
              );
            })}
                        </tbody>
          </table>
        </div>
      </section>
       
      {/* INSIGHTS & HISTORY GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
        {/* EFFICIENCY CARD */}
        <div className="xl:col-span-2 bg-slate-950 rounded-[3rem] p-10 text-white flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-rose-600/10 blur-[100px] rounded-full group-hover:bg-rose-600/20 transition-all" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400 mb-6 italic">Efficiency Benchmark</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4">Total Agency ROI: <span className="text-emerald-400">{data.metrics.globalEfficiency}</span></h3>
            <p className="text-xs font-bold opacity-60 uppercase max-w-md leading-relaxed">
              For every $1.00 spent on payroll, the agency generates {data.metrics.globalEfficiency} in gross revenue. {parseFloat(data.metrics.globalEfficiency) > 3 ? "Performance is currently optimized." : "Room for margin improvement identified."}
            </p>
          </div>
          <div className="relative z-10 flex gap-10 mt-12 pt-8 border-t border-white/10">
            <div>
              <p className="text-[8px] uppercase font-black opacity-50 mb-1">Top Performer</p>
              <p className="font-black italic text-sm">{data.employees.sort((a:any, b:any) => b.roi - a.roi)[0]?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase font-black opacity-50 mb-1">Retention Health</p>
              <p className="font-black italic text-sm text-emerald-400">98%</p>
            </div>
          </div>
        </div>

        {/* LIABILITIES LIST */}
        <div className="bg-card border border-border rounded-[3rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-blue-600" />
            <h4 className="text-[10px] font-black uppercase tracking-widest italic">Fixed Liabilities</h4>
          </div>
          <div className="space-y-4">
            <PayoutItem name="Social Insurance" amount="$1,400" date="Mar 30" />
            <PayoutItem name="Employee Bonuses" amount="$3,200" date="Apr 01" />
            <PayoutItem name="Workstation Stipends" amount="$850" date="Apr 05" />
          </div>
        </div>
      </div>

      {/* NEW: PAYOUT HISTORY TABLE */}
      <section className="space-y-6 pt-10 border-t border-border">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">Expense Records (Payouts)</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-6">Description</th>
                <th className="p-6">Date Processed</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {payoutHistory.length > 0 ? (
                payoutHistory.map((log: any) => (
                  <tr key={log.id} className="text-[11px] hover:bg-muted/10 transition-colors">
                    <td className="p-6 font-black uppercase tracking-tighter">{log.resourceName}</td>
                    <td className="p-6 text-muted-foreground">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="p-6 text-right font-black text-rose-600">-${log.amount.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-[10px] font-black uppercase text-muted-foreground italic">No payout records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function EmployeeStatCard({ label, value, sub, color, icon }: any) {
  const themes: any = {
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/20",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20"
  };

  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm flex justify-between items-start group hover:border-foreground/10 transition-all">
      <div>
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[7px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl ${themes[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function EmployeeRow({ name, role, userType, payout, revenue, netProfit, efficiency, onClick }: any) {
  const netValue = parseFloat(netProfit.replace(/[^0-9.-]/g, ''));
  
  return (
    <tr onClick={onClick} className="group hover:bg-muted/30 transition-all cursor-pointer border-l-4 border-transparent hover:border-rose-600">
      <td className="p-8">
        <div className="flex flex-col">
          <p className="font-black text-sm uppercase tracking-tight italic text-foreground font-sans group-hover:text-rose-600 transition-colors">{name}</p>
          <p className="text-[9px] text-muted-foreground font-bold uppercase font-sans tracking-widest">{role}</p>
        </div>
      </td>
      <td className="p-8">
        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
          userType === "FREELANCER" ? "border-amber-500/50 text-amber-500 bg-amber-500/5" : "border-blue-500/50 text-blue-500 bg-blue-500/5"
        }`}>
          {userType.replace('_', ' ')}
        </span>
      </td>
      <td className="p-8 text-rose-500 font-black">-{payout}</td>
      <td className="p-8 text-emerald-500 font-black">+{revenue}</td>
      <td className={`p-8 font-black ${netValue >= 0 ? 'text-blue-500' : 'text-rose-700'}`}>
        {netValue >= 0 ? '+' : ''}{netProfit}
      </td>
      <td className="p-8 text-right">
        <div className="inline-block px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-transform group-hover:scale-110">
          {efficiency} ROI
        </div>
      </td>
    </tr>
  );
}

function PayoutItem({ name, amount, date }: any) {
  return (
    <div className="flex justify-between items-center p-4 bg-muted/30 rounded-2xl border border-border/50">
      <div>
        <p className="text-[9px] font-black uppercase tracking-tight">{name}</p>
        <p className="text-[8px] font-bold text-muted-foreground uppercase">{date}</p>
      </div>
      <p className="font-mono font-black text-xs">{amount}</p>
    </div>
  );
}

