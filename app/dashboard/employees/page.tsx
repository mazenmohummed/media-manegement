"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  UserPlus, Search, Loader2, Users, Clock, Zap, 
  DollarSign, Wallet, SlidersHorizontal, TrendingUp, CheckSquare, 
  UserCheck
} from "lucide-react";
import { useSession } from "next-auth/react";
import PerformanceTable from "@/components/main/employees/PerformanceTable";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  userType: "FULL_TIME" | "PART_TIME" | "FREELANCER" | "INTERN";
  baseSalary: number;
  walletBalance: number;
  efficiencyRate: number;
  verifiedSkills: string[];
  isCheckedInToday: boolean;
  totalRevenue: number;
  profitContribution: number;
  commissions: number;
  overtime: number;
  totalWorkingHours: number;
  lateCount: number;
  totalPayouts: number;
  ledgerTotal: number;
  tasksCount: number;
  completedTasksCount: number;
  activeTasksCount: number;
  attendanceLogs?: Array<{ type: string }>;
}

interface Metrics {
  employeeCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalPayroll: number;
  totalWallet: number;
  avgEfficiency: number;
  checkedInToday: number;
  upcomingRevenue: number;
  upcomingRevenueBreakdown: {
    pending: number;
    partiallyPaid: number;
  };
}

const USER_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  FREELANCER: "Freelancer",
  INTERN: "Intern",
};

const USER_TYPE_COLOR: Record<string, string> = {
  FULL_TIME: "bg-blue-500/10 text-blue-500",
  PART_TIME: "bg-purple-500/10 text-purple-500",
  FREELANCER: "bg-amber-500/10 text-amber-500",
  INTERN: "bg-slate-500/10 text-slate-400",
};



export default function EmployeesPage() {
  const { data: session, status } = useSession();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        setEmployees(data.employees ?? []);
      } catch (err) {
        console.error("Failed to fetch workforce arrays:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const filteredAndSorted = useMemo(() => {
    let result = employees.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.verifiedSkills.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === "ALL" || e.userType === typeFilter;
      const matchRole = roleFilter === "ALL" || e.role.toUpperCase() === roleFilter;

      

      return matchSearch && matchType && matchRole;
    });

    return result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "efficiency") return b.efficiencyRate - a.efficiencyRate;
      if (sortBy === "wallet") return b.walletBalance - a.walletBalance;
      return 0;
    });
  }, [employees, search, typeFilter, roleFilter, sortBy]);

  

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 animate-pulse">
          Syncing talent registry...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 min-h-screen bg-background">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Human Resources</p>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
            Staff Registry
          </h1>
        </div>
      </header>

      {/* METRICS DASHBOARD */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={<Users size={14} />} label="Workforce" value={metrics.employeeCount} />
          <MetricCard icon={<UserCheck size={14} />} label="On-Site Today" value={metrics.checkedInToday} color="text-emerald-500" />
          <MetricCard icon={<TrendingUp size={14} />} label="Total Revenue" value={`$${Math.round(metrics.totalRevenue).toLocaleString()}`} color="text-emerald-500" />
          <UpcomingRevenueCard total={metrics.upcomingRevenue} breakdown={metrics.upcomingRevenueBreakdown} />
          <MetricCard icon={<DollarSign size={14} />} label="Payroll Load" value={`$${Math.round(metrics.totalPayroll).toLocaleString()}`} color="text-rose-500" />
          <MetricCard icon={<Wallet size={14} />} label="Pending Wallet" value={`$${Math.round(metrics.totalWallet).toLocaleString()}`} color="text-amber-500" />
          <MetricCard icon={<CheckSquare size={14} />} label="Avg Efficiency" value={`${(metrics.avgEfficiency * 100).toFixed(0)}%`} />
          <MetricCard icon={<TrendingUp size={14} />} label="Total Profit" value={`$${Math.round(metrics.totalProfit).toLocaleString()}`} color="text-blue-500" />
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-card border border-border p-6 rounded-[2rem] space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <SlidersHorizontal size={12} />
          <span className="text-[9px] font-black uppercase tracking-wider">Registry Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="relative md:col-span-4">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role, skill..."
              className="w-full bg-muted/40 border border-border pl-10 pr-4 py-3 rounded-xl text-[11px] font-bold focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-muted/40 border border-border px-3 py-3 rounded-xl text-[11px] font-bold focus:outline-none">
              <option value="ALL">All Contracts</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full bg-muted/40 border border-border px-3 py-3 rounded-xl text-[11px] font-bold focus:outline-none">
              <option value="ALL">All Roles</option>
              <option value="CREATIVE">Creative</option>
              <option value="OPERATOR">Operator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-muted/40 border border-border px-3 py-3 rounded-xl text-[11px] font-bold focus:outline-none">
              <option value="name">Sort by Name</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="efficiency">Sort by Efficiency</option>
              <option value="wallet">Sort by Balance</option>
            </select>
          </div>
        </div>
      </div>

   
      {/* PERFORMANCE TERMINAL SYSTEM TABLE */}
      <PerformanceTable 
        performanceData={filteredAndSorted.map((emp: any) => ({
          name: emp.name,
          skills: emp.verifiedSkills || [],
          tasksCompleted: emp.completedTasksCount || 0,
          tasksCount: emp.tasksCount || 0,
          revenueGenerated: emp.totalRevenue || 0, 
          workingHours: emp.totalWorkingHours || 0,
          lateDays: emp.lateCount || 0,
          baseSalary: emp.baseSalary || 0, 
          commissions: emp.commissions || 0, 
          overtime: emp.overtime || 0,
          deductions: emp.deductions || 0, 
          extraPayouts: emp.totalPayouts || 0,
          expenses: emp.ledgerTotal || 0,
          efficiency: emp.efficiencyRate || 0,
          // ✅ Fixed: Changed to check the embedded leaves array for approved statuses
          activeLeaves: emp.leaves?.filter((leave: any) => {
            return leave.status?.trim().toUpperCase() === "APPROVED";
          }).length || 0,
          walletBalance: emp.walletBalance || 0,
        }))} 
      />
            {/* CARDS REGISTRY */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-24 opacity-30">
          <Users size={40} className="mx-auto mb-4" />
          <p className="text-sm font-black uppercase tracking-widest">No matching users</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSorted.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, color = "text-foreground" }: {
  icon: React.ReactNode; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="bg-card border border-border p-5 rounded-3xl hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2 mb-3 opacity-50">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-black italic ${color}`}>{value}</p>
    </div>
  );
}

function UpcomingRevenueCard({ total, breakdown }: { total: number; breakdown: { pending: number; partiallyPaid: number } }) {
  return (
    <div className="bg-card border border-border p-5 rounded-3xl hover:border-primary/30 transition-all flex flex-col justify-between group relative overflow-hidden">
      <div>
        <div className="flex items-center gap-2 mb-3 opacity-50">
          <Clock size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[8px] font-black uppercase tracking-widest">Upcoming Revenue</span>
        </div>
        <p className="text-2xl font-black italic text-blue-400">${Math.round(total).toLocaleString()}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[8px] font-black uppercase tracking-wider opacity-60">
        <div className="flex flex-col">
          <span className="opacity-40 mb-0.5">Unbilled Pipeline</span>
          <span className="text-foreground font-mono font-bold">${Math.round(breakdown.pending).toLocaleString()}</span>
        </div>
        <div className="w-[1px] h-5 bg-border/60 mx-2" />
        <div className="flex flex-col text-right">
          <span className="opacity-40 mb-0.5">Partial Paid Collect</span>
          <span className="text-amber-500 font-mono font-bold">${Math.round(breakdown.partiallyPaid).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({ emp }: { emp: Employee }) {
  const isFreelancer = emp.userType === "FREELANCER";
  const payDisplay = isFreelancer ? emp.walletBalance : emp.baseSalary;
  const payLabel = isFreelancer ? "Pending Fees" : "Monthly Salary";

  return (
    <Link href={`/dashboard/employees/${emp.id}`}>
      <div className="bg-card border border-border p-6 rounded-[2.5rem] hover:border-primary/40 transition-all group relative overflow-hidden flex flex-col h-full">
        <div className="relative z-10 flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${emp.isCheckedInToday ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-background"} transition-colors`}>
              {emp.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black uppercase leading-tight">{emp.name}</p>
              <p className="text-[8px] font-black text-primary uppercase tracking-widest">{emp.role}</p>
            </div>
          </div>
          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${USER_TYPE_COLOR[emp.userType]}`}>
            {USER_TYPE_LABEL[emp.userType]}
          </span>
        </div>

        {/* Operational Tasks Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-border/50 text-center">
          <div><p className="text-sm font-black text-blue-500">{emp.activeTasksCount}</p><p className="text-[7px] font-black uppercase opacity-40">Active</p></div>
          <div><p className="text-sm font-black text-emerald-500">{emp.completedTasksCount}</p><p className="text-[7px] font-black uppercase opacity-40">Done</p></div>
          <div><p className="text-sm font-black">{emp.tasksCount}</p><p className="text-[7px] font-black uppercase opacity-40">Total</p></div>
        </div>

        {/* Ledger Micro Tracking Grid (Commissions & Overtime Added Here) */}
        <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/50 mb-4 bg-muted/10 rounded-xl px-2">
          <div className="text-left border-r border-border/40 pr-2">
            <span className="text-[6.5px] font-black uppercase opacity-40 block">Commission</span>
            <span className="text-xs font-mono font-black text-emerald-500">+${emp.commissions.toFixed(2)}</span>
          </div>
          <div className="text-right pl-2">
            <span className="text-[6.5px] font-black uppercase opacity-40 block">Overtime</span>
            <span className="text-xs font-mono font-black text-blue-400">+${emp.overtime.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-5 min-h-[20px]">
          {emp.verifiedSkills.slice(0, 2).map(skill => (
            <span key={skill} className="text-[7px] font-black uppercase px-2 py-0.5 border border-border rounded-md opacity-50">{skill}</span>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-border flex items-end justify-between">
          <div>
            <p className="text-[7px] font-black uppercase opacity-40 mb-0.5">{payLabel}</p>
            <p className="text-xl font-black font-mono">${payDisplay.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[7px] font-black uppercase opacity-40 mb-0.5">Efficiency</p>
            <p className="text-sm font-black">{((emp.efficiencyRate ?? 1) * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </Link>
  );
}