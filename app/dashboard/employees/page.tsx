"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { UserPlus, Search, ArrowUpRight, UserCheck, X } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import PerformanceTable from "@/components/main/employees/PerformanceTable";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  userType: "FULL_TIME" | "PART_TIME" | "FREELANCER" | "INTERN";
  efficiencyRate: number;
  // new canonical fields
  baseSalary?: number;    // monthly salary for staff
  walletBalance?: number; // accrued balance (freelancer pending fees / accruals)
  // legacy compatibility (some endpoints might still use salary)
  salary?: number;

  verifiedSkills: string[];
  workingHours: number;
  extraPayouts: number;
  expenses: number;
  lateDays: number;
  totalRevenue: number;
  profitContribution: number;
  tasks: { internalCost: number; status: string; paymentStatus: string }[];
  attendanceLogs: { type: string; date: string; isLate: boolean; totalHours: number }[];
}

export default function EmployeesDirectory() {
  const { data: session, status } = useSession();
  const agencyId = session?.user?.agencyId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState("FULL_TIME");

  const TODAY_STR = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function loadDirectory() {
      if (!agencyId) return;
      try {
        const res = await fetch(`/api/employees?agencyId=${agencyId}`);
        const data = await res.json();
        
        const incoming = Array.isArray(data.employees) ? data.employees : [];

        // Normalize fields to support schema change (baseSalary + walletBalance).
        const normalized: Employee[] = incoming.map((emp: any) => {
          const baseSalary = typeof emp.baseSalary === "number"
            ? emp.baseSalary
            : typeof emp.salary === "number"
              ? emp.salary
              : 0;

          const walletBalance = typeof emp.walletBalance === "number"
            ? emp.walletBalance
            : // fallback for older APIs that returned salary as accrued balance for freelancers
            (emp.userType === "FREELANCER" && typeof emp.salary === "number" ? emp.salary : 0);

          return {
            ...emp,
            baseSalary,
            walletBalance,
            salary: emp.salary, // preserve if present
          } as Employee;
        });

        setEmployees(normalized);
      } catch (err) {
        console.error("Directory Sync Failed:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated") loadDirectory();
    else if (status === "unauthenticated") setLoading(false);
  }, [agencyId, status]);

  const filtered = useMemo(() => {
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, employees]);

  // Payroll: sum of base salaries + pending wallet balances (liabilities)
  const totalPayroll = useMemo(() => {
    return employees.reduce((acc, emp) => {
      const base = emp.baseSalary ?? 0;
      const wallet = emp.walletBalance ?? 0;
      return acc + base + wallet;
    }, 0);
  }, [employees]);

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agencyId) return alert("Session expired. Please log in again.");

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      setIsSubmitting(false);
      return;
    }

    const skillsRaw = formData.get("verifiedSkills") as string;
    const skillsArray = skillsRaw 
      ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean) 
      : [];

    // Send baseSalary (schema aligned) instead of legacy 'salary'
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password,
      role: formData.get("role"),
      userType: formData.get("userType"),
      baseSalary: parseFloat(formData.get("salary") as string) || 0,
      agencyId,
      verifiedSkills: skillsArray,
      // walletBalance intentionally omitted (defaults to 0)
    };

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        // normalize returned employee (server may return baseSalary or salary)
        const emp = {
          ...result,
          baseSalary: result.baseSalary ?? result.salary ?? 0,
          walletBalance: result.walletBalance ?? result.salary ?? 0,
        } as Employee;

        setIsModalOpen(false);
        setEmployees((prev) => [...prev, emp]);
      } else {
        alert(result.error || "Failed to onboard employee");
      }
    } catch (err) {
      console.error("Connection error:", err);
      alert("Connection error while onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic">
      Syncing Global Talent...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-background min-h-screen text-foreground">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Staff Registry</h1>
          <p className="text-muted-foreground font-medium text-sm">Human Resource Management & Productivity</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or role..." 
              className="w-full bg-background border border-border pl-12 pr-4 py-3 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-primary/20"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-foreground text-background p-4 rounded-2xl hover:scale-95 transition-all shadow-lg hover:bg-primary"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MODAL (Onboard Talent) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Onboard Talent</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Full Name</label>
                  <input name="name" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm focus:border-primary transition-colors" placeholder="Name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Work Email</label>
                  <input name="email" type="email" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm focus:border-primary transition-colors" placeholder="email@agency.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Internal Role</label>
                  <select name="role" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none font-black uppercase text-[10px]">
                    <option value="CREATIVE">Creative</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Contract Type</label>
                  <select name="userType" value={selectedUserType} onChange={(e) => setSelectedUserType(e.target.value)} className="w-full bg-background border border-border p-4 rounded-2xl outline-none font-black uppercase text-[10px]">
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="FREELANCER">Freelancer</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">
                    {selectedUserType === "FREELANCER" ? "Project Rate ($)" : "Monthly Salary ($)"}
                  </label>
                  <input name="salary" type="number" step="0.01" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm font-mono" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Verified Skills</label>
                  <input name="verifiedSkills" className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm" placeholder="React, Figma, SEO..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Password</label>
                  <input name="password" type="password" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm" placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Confirm</label>
                  <input name="confirmPassword" type="password" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none text-sm" placeholder="••••••••" />
                </div>
              </div>

              <button disabled={isSubmitting} className="w-full bg-foreground text-background py-5 rounded-3xl font-black uppercase italic tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-50 shadow-xl shadow-foreground/10">
                {isSubmitting ? "Initializing Record..." : "Confirm Onboarding"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBlock label="Total Workforce" value={employees.length} />
        <StatBlock 
            label="On-Site Today" 
            value={employees.filter(e => e.attendanceLogs?.some(log => log.date === TODAY_STR && log.type === "Work Day")).length} 
            color="text-emerald-500" 
        />
        <StatBlock 
            label="Avg Efficiency" 
            value={`${((employees.reduce((acc, e) => acc + (e.efficiencyRate || 0), 0) / (employees.length || 1)) * 100).toFixed(0)}%`} 
        />
        <StatBlock 
            label="Total Payroll" 
            value={`$${Math.round(totalPayroll).toLocaleString()}`}
            color="text-orange-600"
        />
      </div>

      <PerformanceTable 
        performanceData={employees.map(emp => ({
          name: emp.name,
          skills: emp.verifiedSkills || [],
          tasksCompleted: emp.tasks?.filter(t => t.status === "COMPLETED").length || 0,
          tasksCount: emp.tasks?.length || 0,
          revenueGenerated: emp.totalRevenue || 0, 
          workingHours: emp.workingHours || 0,
          lateDays: emp.lateDays || 0,
          baseSalary: emp.baseSalary || 0, 
          extraPayouts: emp.extraPayouts || 0,
          expenses: emp.expenses || 0,
          efficiency: emp.efficiencyRate || 0,
          activeLeaves: emp.attendanceLogs?.filter(log => log.type === "Vacation").length || 0,
          walletBalance: emp.walletBalance || 0,
        }))} 
      />

      {/* GRID ENGINE */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 px-2">
          <UserCheck className="w-3 h-3" /> Talent Breakdown
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((emp) => {
            const isAway = emp.attendanceLogs?.some(log => log.date === TODAY_STR && log.type === "Vacation");
            const tasks = emp.tasks || [];

            const activeTasksCount = tasks.filter(t => t.status === "ACTIVE").length;
            const doneTasksCount = tasks.filter(t => t.status?.toUpperCase() === "COMPLETED" || t.status?.toUpperCase() === "FINISHED").length;
            const dueTasksCount = tasks.filter(t => t.status?.toUpperCase() === "PENDING" || t.status?.toUpperCase() === "TODO").length;

            // Freelancer: use walletBalance as accumulatedPay. Staff: show baseSalary as monthly payout.
            const accumulatedPay = emp.userType === "FREELANCER"
              ? (emp.walletBalance ?? 0)
              : (emp.baseSalary ?? 0);

            const paymentLabel = emp.userType === "FREELANCER" ? "Pending Fees" : "Monthly Payout";

            return (
              <Link key={emp.id} href={`/dashboard/employees/${emp.id}`}>
                <div className={`bg-card border p-8 rounded-[2.5rem] transition-all group relative overflow-hidden flex flex-col justify-between h-full ${isAway ? 'border-orange-500/30 bg-orange-500/5' : 'border-border hover:border-primary/40'}`}>
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl italic ${isAway ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black uppercase text-lg leading-tight">{emp.name}</h3>
                          {isAway && <span className="px-2 py-0.5 rounded-full bg-orange-500 text-[8px] text-white font-black uppercase">Away</span>}
                        </div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{emp.role}</p>
                      </div>
                    </div>

                    {/* TASK ANALYTICS GRID */}
                    <div className="grid grid-cols-3 gap-2 mb-8 border-y border-border/50 py-4">
                      <div className="text-center">
                        <p className="text-[7px] font-black uppercase text-muted-foreground">Active</p>
                        <p className="text-sm font-black">{activeTasksCount}</p>
                      </div>
                      <div className="text-center border-x border-border/50">
                        <p className="text-[7px] font-black uppercase text-muted-foreground">Done</p>
                        <p className="text-sm font-black text-emerald-500">{doneTasksCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black uppercase text-muted-foreground">Due</p>
                        <p className={`text-sm font-black ${dueTasksCount > 0 ? 'text-orange-500' : ''}`}>
                          {dueTasksCount}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-8 flex-wrap">
                      {emp.verifiedSkills?.slice(0, 3).map(skill => (
                        <span key={skill} className="text-[7px] font-black uppercase border border-border px-2 py-1 rounded-md opacity-60">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 italic">
                          {paymentLabel}
                        </p>
                        <p className={`text-xl font-black font-mono ${accumulatedPay > 0 ? 'text-orange-600' : 'text-foreground'}`}>
                          ${accumulatedPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Efficiency</p>
                        <p className="font-black text-sm">{((emp.efficiencyRate || 0) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatBlock({ label, value, color = "text-foreground" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}