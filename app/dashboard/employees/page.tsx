"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { UserPlus, Search, ArrowUpRight, UserCheck, X } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react"; // 1. Import useSession

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  userType: string;
  efficiencyRate: number;
  verifiedSkills: string[];
  tasks: { grossRevenue: number; status: string; paymentStatus: string }[];
  attendanceLogs: { type: string; date: string }[];
}

export default function EmployeesDirectory() {
  // 2. Extract session and agencyId
  const { data: session, status } = useSession();
  const agencyId = session?.user?.agencyId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TODAY_STR = format(new Date(), "yyyy-MM-dd");

  // 3. Update useEffect to wait for agencyId
  useEffect(() => {
    async function loadDirectory() {
      if (!agencyId) return;
      
      try {
        const res = await fetch(`/api/employees?agencyId=${agencyId}`);
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Directory Sync Failed:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (status === "authenticated") {
      loadDirectory();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [agencyId, status]);

  const filtered = useMemo(() => {
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, employees]);

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
      ? skillsRaw.split(",").map(s => s.trim()).filter(s => s !== "") 
      : [];

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: password, 
      role: formData.get("role"),
      userType: formData.get("userType"),
      agencyId: agencyId, // Now using dynamic agencyId
      verifiedSkills: skillsArray,
    };

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        setEmployees((prev) => [...prev, result]); 
      } else {
        alert(result.error || "Failed to onboard employee");
      }
    } catch (err) {
      console.error("Connection error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update Loading state to handle session status
  if (status === "loading" || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic">
      Syncing Global Talent...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-background min-h-screen text-foreground relative">
      
      {/* HEADER SECTION */}
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
              className="w-full bg-background border border-border pl-12 pr-4 py-3 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-primary/20 transition-all"
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

      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Onboard Talent</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Full Name</label>
                <input name="name" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold" placeholder="Mazen ..." />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Work Email</label>
                <input name="email" type="email" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold" placeholder="name@agency.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">System Role</label>
                  <select name="role" required className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-black uppercase text-[10px]">
                    <option value="CREATIVE">Creative</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Contract</label>
                  <select name="userType" className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-black uppercase text-[10px]">
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="FREELANCER">Freelancer</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
              </div>

              {/* PASSWORD FIELDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 italic">Assign Password</label>
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 italic">Confirm Access</label>
                  <input 
                    name="confirmPassword" 
                    type="password" 
                    required 
                    className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Verified Skills</label>
                <input 
                    name="verifiedSkills" 
                    className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold" 
                    placeholder="React, Next.js, Prisma (separate with commas)" 
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-foreground text-background py-5 rounded-3xl font-black uppercase italic tracking-widest hover:bg-primary transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm Onboarding"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBlock label="Total Workforce" value={employees.length} />
        <StatBlock 
            label="On-Site Today" 
            value={employees.filter(e => e.attendanceLogs?.some(log => log.date === TODAY_STR && log.type === "Work Day")).length} 
            color="text-emerald-500" 
        />
        <StatBlock 
            label="Pending Payouts" 
            value={`$${employees.reduce((acc, emp) => acc + (emp.tasks?.filter(t => t.paymentStatus === "Pending").reduce((s, t) => s + t.grossRevenue, 0) || 0), 0).toLocaleString()}`} 
            color="text-orange-600" 
        />
        <StatBlock label="Avg Efficiency" value={`${(employees.reduce((acc, e) => acc + (e.efficiencyRate || 0), 0) / employees.length * 100 || 0).toFixed(0)}%`} />
      </div>

      {/* GRID ENGINE */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <UserCheck className="w-3 h-3" /> Talent Breakdown
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((emp) => {
              const isAway = emp.attendanceLogs?.some(log => log.date === TODAY_STR && log.type === "Vacation");
              const pendingMoney = emp.tasks?.filter(t => t.paymentStatus === "Pending").reduce((sum, t) => sum + t.grossRevenue, 0) || 0;

              return (
                  <Link key={emp.id} href={`/dashboard/employees/${emp.id}`}>
                  <div className={`bg-card border p-8 rounded-[2.5rem] transition-all group relative overflow-hidden flex flex-col justify-between h-full ${isAway ? 'border-orange-500/30 bg-orange-500/5' : 'border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5'}`}>
                      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div>
                      <div className="flex items-center gap-4 mb-8">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl italic transition-colors ${isAway ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'}`}>
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

                      <div className="flex gap-2 mb-8">
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
                          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 italic">Total Debt</p>
                          <p className={`text-xl font-black font-mono ${pendingMoney > 0 ? 'text-orange-600' : 'text-foreground'}`}>
                              ${pendingMoney.toLocaleString()}
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