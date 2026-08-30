// components/employees/EmployeeProfile.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit3, Trash2, UserCheck, Wallet, ArrowUpRight, ShieldCheck, CalendarPlus, Check, X, Edit, Trash2 as TrashIcon
} from "lucide-react";

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason?: string | null;
  approvedBy?: string | null;
  approval?: {
    decider?: { name: string } | null;
    decidedAt?: string | null;
  } | null;
}

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const router = useRouter();

  // --- CORE STATES ---
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TASKS" | "ATTENDANCE" | "LEAVES">("TASKS");
  const [isSaving, setIsSaving] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // --- LEAVES: fetched from its own dedicated endpoint ---
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(true);

  // --- EDIT PROFILE MODAL STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "CREATIVE",
    userType: "FULL_TIME",
    baseSalary: 0,
    efficiencyRate: 1.0,
    email: "",
    password: "",
    verifiedSkills: [] as string[],
  });

  // --- FILTER STATES ---
  const [filterMode, setFilterMode] = useState<"PRESET" | "MONTH">("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // --- LEAVE REQUEST STATES ---
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    type: "Annual",
    reason: "",
  });

  // --- LEAVE EDIT STATES ---
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [isUpdatingLeave, setIsUpdatingLeave] = useState(false);
  const [editLeaveForm, setEditLeaveForm] = useState({
    startDate: "",
    endDate: "",
    type: "",
    reason: "",
    status: "",
  });

  // --- PAYROLL STATES ---
  const [payrollData, setPayrollData] = useState<any>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // --- DATA FETCHING - DECLARE ALL fetch FUNCTIONS FIRST ---

  // 1. Fetch employee details
  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${employeeId}`);
      const data = await res.json();
      setEmployee(data);

      setEditForm({
        name: data.name || "",
        role: data.role || "CREATIVE",
        userType: data.userType || "FULL_TIME",
        baseSalary: data.baseSalary || 0,
        efficiencyRate: data.efficiencyRate ?? 1.0,
        email: data.email || "",
        password: "",
        verifiedSkills: data.verifiedSkills || [],
      });
    } catch (err) {
      console.error("Failed to load employee profile", err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  // 2. Fetch leaves
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${employeeId}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error("Failed to load leave records", err);
    } finally {
      setLeavesLoading(false);
    }
  }, [employeeId]);

  // 3. Fetch payroll data
  const fetchPayrollData = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const res = await fetch(`/api/payroll/employee/${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollData(data.data);
      }
    } catch (err) {
      console.error("Failed to load payroll data", err);
    } finally {
      setPayrollLoading(false);
    }
  }, [employeeId]);

  // --- USE EFFECTS - NOW ALL fetch FUNCTIONS ARE DECLARED ---

  useEffect(() => {
    if (employeeId) {
      fetchDetails();
      fetchLeaves();
      fetchPayrollData();
    }
  }, [employeeId, fetchDetails, fetchLeaves, fetchPayrollData]);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchDetails();
        setIsEditing(false);
      } else {
        const errData = await res.json();
        alert(errData.error || "Update failed");
      }
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTerminate = async () => {
    const confirmTermination = confirm(
      `WARNING: Are you sure you want to terminate ${employee.name}? This action cannot be undone.`
    );
    if (!confirmTermination) return;

    setIsTerminating(true);
    try {
      const res = await fetch(`/api/users/${employeeId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/employees");
      } else {
        const errData = await res.json();
        alert(errData.error || "Termination failed");
      }
    } catch (err) {
      console.error("Termination error:", err);
    } finally {
      setIsTerminating(false);
    }
  };

  // --- LEAVE HANDLERS ---
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const res = await fetch(`/api/users/${employeeId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          type: leaveForm.type,
          reason: leaveForm.reason || null,
        }),
      });

      if (res.ok) {
        setLeaveForm({ startDate: "", endDate: "", type: "Annual", reason: "" });
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit leave request");
      }
    } catch (err) {
      console.error("Leave request failed", err);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Quick Action for Admin Approval/Rejection
  const handleQuickStatusUpdate = async (leave: LeaveRecord, newStatus: "APPROVED" | "REJECTED") => {
    const payload = {
      leaveId: leave.id,
      status: newStatus,
    };

    try {
      const res = await fetch(`/api/users/${employeeId}/leaves`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || `Failed to ${newStatus.toLowerCase()} leave request`);
      }
    } catch (err) {
      console.error("Failed quick updating leave status", err);
    }
  };

  // Handle Leave Update
  const handleUpdateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaveId) return;

    setIsUpdatingLeave(true);
    try {
      const res = await fetch(`/api/users/${employeeId}/leaves`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: editingLeaveId,
          startDate: editLeaveForm.startDate,
          endDate: editLeaveForm.endDate,
          type: editLeaveForm.type,
          reason: editLeaveForm.reason,
          status: editLeaveForm.status,
        }),
      });

      if (res.ok) {
        setEditingLeaveId(null);
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update leave");
      }
    } catch (err) {
      console.error("Failed to update leave:", err);
    } finally {
      setIsUpdatingLeave(false);
    }
  };

  // Handle Leave Delete
  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Are you sure you want to delete this leave request? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/users/${employeeId}/leaves?leaveId=${leaveId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete leave");
      }
    } catch (err) {
      console.error("Failed to delete leave:", err);
    }
  };

  // --- DYNAMIC CALCULATIONS ---
  const filteredTasks = useMemo(() => {
    if (!employee?.tasks) return [];
    return employee.tasks.filter((task: any) => {
      const taskDate = new Date(task.startDate || task.createdAt);
      if (filterMode === "MONTH") return taskDate.getMonth() === selectedMonth;
      if (filterMode === "PRESET") {
        if (activePreset === "ALL") return true;
        const month = taskDate.getMonth();
        if (activePreset === "Q1") return month >= 0 && month <= 2;
        if (activePreset === "Q2") return month >= 3 && month <= 5;
      }
      return true;
    });
  }, [employee, filterMode, activePreset, selectedMonth]);

  const financeStats = useMemo(() => {
    if (!filteredTasks || filteredTasks.length === 0) {
      return { gross: 0, net: 0 };
    }

    const gross = filteredTasks.reduce((acc: number, t: any) => acc + (t.internalCost || 0), 0);
    const net = filteredTasks.reduce((acc: number, t: any) => acc + (t.marginAmount || 0), 0);

    return { gross, net };
  }, [filteredTasks]);

  if (loading) return <div className="p-20 text-center font-black uppercase italic animate-pulse">Syncing Employee Ledger...</div>;
  if (!employee) return <div className="p-20 text-center">Employee not found.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-background min-h-screen text-foreground relative">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </button>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center text-3xl font-black italic shadow-2xl shadow-primary/20">
              {employee.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{employee.name}</h1>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mt-2">
                {employee.role} • {employee.userNo || "NO-ID"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-card border border-border px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-muted transition-all">
            <Edit3 size={14} /> Edit Profile
          </button>
          <button onClick={handleTerminate} disabled={isTerminating} className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-destructive hover:text-white transition-all disabled:opacity-50">
            <Trash2 size={14} /> {isTerminating ? "Processing..." : "Terminate"}
          </button>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary p-6 rounded-[2rem] text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden group">
           <ArrowUpRight className="absolute -right-2 -top-2 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
           <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Revenue Generated</p>
           <h2 className="text-4xl font-black italic tracking-tighter mt-1">
             ${financeStats.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </h2>
           <p className="text-[9px] font-bold mt-2 uppercase opacity-70">Across {filteredTasks.length} Projects</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-[2rem] flex flex-col justify-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Agency Profit</p>
           <h2 className="text-4xl font-black italic tracking-tighter mt-1 text-emerald-600">
             ${financeStats.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </h2>
        </div>

        <div className="bg-card border border-border p-6 rounded-[2rem] flex flex-col justify-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Efficiency Rating</p>
           <h2 className="text-4xl font-black italic tracking-tighter mt-1 text-blue-600">
             {employee.baseSalary > 0 ? (financeStats.gross / employee.baseSalary).toFixed(1) : "0.0"}x
           </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT COLUMN: FINANCIALS & IDENTITY */}
        <div className="space-y-6">
          <section className="bg-card border border-border p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet size={80} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Wallet size={14} className="text-primary"/> Financial Wallet
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Monthly Salary</p>
                  <p className="text-2xl font-black italic tracking-tighter">${employee.baseSalary?.toLocaleString() || "0.00"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Wallet Balance</p>
                  <p className="text-2xl font-black italic tracking-tighter text-emerald-600">${employee.walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between">
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Period Gross</p>
                    <p className="text-lg font-black italic">${financeStats.gross.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-emerald-600 uppercase">Period Net</p>
                    <p className="text-lg font-black italic text-emerald-600">${financeStats.net.toLocaleString()}</p>
                  </div>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border p-8 rounded-[2.5rem] space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <UserCheck size={14} className="text-primary"/> System Identity
            </h3>
            <div className="space-y-4 pt-2">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Internal Email</span>
                <span className="text-[11px] font-bold break-all">{employee.email}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Employment Type</span>
                <span className="text-[11px] font-bold uppercase text-blue-600">{employee.userType?.replace('_', ' ')}</span>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border p-8 rounded-[2.5rem] space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <ShieldCheck size={14} className="text-primary"/> Verified Skills
             </h3>
             <div className="flex flex-wrap gap-2 pt-2">
               {employee.verifiedSkills?.map((skill: string, i: number) => (
                 <span key={i} className="px-3 py-1 bg-muted rounded-lg text-[9px] font-black uppercase tracking-tighter">{skill}</span>
               )) || <span className="text-[10px] text-muted-foreground italic">No skills listed</span>}
             </div>
          </section>
        </div>

        {/* MIDDLE/RIGHT COLUMN: CONTENT TABS */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border p-4 rounded-[2rem] flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-2">
              {["TASKS", "ATTENDANCE", "LEAVES"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    activeTab === tab ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-background p-1 rounded-xl border">
                <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)} className="bg-transparent text-[9px] font-black uppercase px-2 outline-none cursor-pointer">
                  <option value="PRESET">Presets</option>
                  <option value="MONTH">Monthly</option>
                </select>
                <div className="w-[1px] h-4 bg-border" />
                {filterMode === "MONTH" ? (
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[9px] font-black uppercase px-2 outline-none cursor-pointer">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                ) : (
                  <select value={activePreset} onChange={(e) => setActivePreset(e.target.value)} className="bg-transparent text-[9px] font-black uppercase px-2 outline-none cursor-pointer">
                    <option value="ALL">All Time</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                  </select>
                )}
            </div>
          </div>

          <div className="min-h-[400px]">
            {activeTab === "TASKS" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.length > 0 ? filteredTasks.map((task: any) => (
                  <div key={task.id} className="bg-card border border-border p-6 rounded-[2rem] group hover:border-primary transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[8px] font-black text-primary uppercase">{task.project?.projectName || "Direct Task"}</p>
                        <h4 className="font-black uppercase text-sm italic group-hover:translate-x-1 transition-transform">{task.taskType}</h4>
                      </div>
                      <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex justify-between items-end border-t border-border pt-4 mt-2">
                       <span className="text-[9px] font-black uppercase px-2 py-1 bg-muted rounded-md">{task.status}</span>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-muted-foreground uppercase">Revenue</p>
                        <p className="text-sm font-black italic">
                             ${task.internalCost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                        </p>
                    </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-20 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-border rounded-[2rem]">
                    No tasks found for this period
                  </div>
                )}
              </div>
            )}

           {activeTab === "ATTENDANCE" && (
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">
                        <th className="p-6 pl-8">Date / Type</th>
                        <th className="p-6">Status</th>
                        <th className="p-6">Check In</th>
                        <th className="p-6">Check Out</th>
                        <th className="p-6 text-right pr-8">Total Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono text-xs">
                      {employee.attendanceLogs?.length > 0 ? (
                        employee.attendanceLogs.map((log: any) => {
                          const formattedDate = new Date(log.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          });

                          const checkInTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—";
                          const checkOutTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—";

                          return (
                            <tr key={log.id || log._id} className="hover:bg-muted/10 transition-colors group">
                              <td className="p-6 pl-8">
                                <div className="flex flex-col">
                                  <span className="font-black text-foreground uppercase italic text-[13px] tracking-tight group-hover:text-primary transition-colors">
                                    {formattedDate}
                                  </span>
                                  <span className="text-[8px] font-black tracking-widest text-muted-foreground/80 uppercase mt-0.5">
                                    {log.task?.project?.projectName || "Direct Assignment"} • {log.task?.taskType || log.type || "FIELD_TASK"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col gap-1.5 items-start">
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                    log.status === 'COMPLETED' || log.status === 'Present'
                                      ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                                      : 'bg-amber-500/5 text-amber-500 border-amber-500/20'
                                  }`}>
                                    {log.status || "PENDING"}
                                  </span>
                                  {log.isLate && (
                                    <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/10">
                                      LATE ENTRY
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-6 space-y-1">
                                <div className="text-foreground font-black text-[11px]">
                                  {checkInTime}
                                </div>
                                {log.checkInLat && log.checkInLng && (
                                  <div className="text-[8px] text-muted-foreground font-bold tracking-tight bg-muted/50 px-2 py-0.5 rounded-md inline-block">
                                    GPS: {log.checkInLat.toFixed(4)}°, {log.checkInLng.toFixed(4)}°
                                  </div>
                                )}
                              </td>

                              <td className="p-6 space-y-1">
                                <div className="text-foreground font-black text-[11px]">
                                  {checkOutTime}
                                </div>
                                {log.checkOutLat && log.checkOutLng ? (
                                  <div className="text-[8px] text-muted-foreground font-bold tracking-tight bg-muted/50 px-2 py-0.5 rounded-md inline-block">
                                    GPS: {log.checkOutLat.toFixed(4)}°, {log.checkOutLng.toFixed(4)}°
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground/40 italic">Active Session</span>
                                )}
                              </td>

                              <td className="p-6 text-right pr-8">
                                <div className="inline-block px-3 py-1.5 bg-foreground text-background font-black rounded-xl text-[11px] uppercase tracking-tight italic">
                                  {log.totalHours !== undefined && log.totalHours !== null
                                    ? `${Number(log.totalHours).toFixed(3)} hrs`
                                    : "0.000 hrs"
                                  }
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest italic">
                            No attendance logs found for this employee.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "LEAVES" && (
              <div className="space-y-6">
                {/* REQUEST FORM */}
                <form onSubmit={handleRequestLeave} className="bg-card border border-border p-6 rounded-[2rem] space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                    <CalendarPlus size={14} /> Request New Leave Period
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-muted-foreground">Start Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.startDate} 
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} 
                        className="w-full bg-muted/30 border border-border p-2.5 rounded-xl text-[11px] font-bold outline-none" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-muted-foreground">End Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.endDate} 
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} 
                        className="w-full bg-muted/30 border border-border p-2.5 rounded-xl text-[11px] font-bold outline-none" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-muted-foreground">Leave Type</label>
                      <select 
                        value={leaveForm.type} 
                        onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })} 
                        className="w-full bg-muted/30 border border-border p-2.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer"
                      >
                        <option value="Annual">Annual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-muted-foreground">Reason (Optional)</label>
                      <input 
                        type="text" 
                        value={leaveForm.reason} 
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} 
                        placeholder="e.g., Family vacation, Doctor's appointment..."
                        className="w-full bg-muted/30 border border-border p-2.5 rounded-xl text-[11px] font-bold outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmittingLeave} 
                      className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {isSubmittingLeave ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>

                {/* LEAVE HISTORY WITH APPROVAL STATUS */}
                <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="p-6">Period</th>
                        <th className="p-6">Type</th>
                        <th className="p-6">Reason</th>
                        <th className="p-6">Status</th>
                        <th className="p-6">Approved By</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {leavesLoading ? (
                        <tr><td colSpan={6} className="p-20 text-center text-muted-foreground text-[10px] font-black uppercase italic animate-pulse">Loading leave records...</td></tr>
                      ) : leaves.length > 0 ? (
                        leaves.map((leave) => (
                          <tr key={leave.id} className="text-[11px] font-bold uppercase hover:bg-muted/10 transition-colors">
                            {editingLeaveId === leave.id ? (
                              // EDIT MODE
                              <td colSpan={6} className="p-4">
                                <form onSubmit={handleUpdateLeave} className="flex flex-wrap items-end gap-3 bg-muted/20 p-4 rounded-xl">
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-black text-muted-foreground block">Start</label>
                                    <input 
                                      type="date" 
                                      value={editLeaveForm.startDate} 
                                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, startDate: e.target.value })} 
                                      className="bg-background border border-border p-1.5 rounded-lg text-[10px] font-bold outline-none w-32"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-black text-muted-foreground block">End</label>
                                    <input 
                                      type="date" 
                                      value={editLeaveForm.endDate} 
                                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, endDate: e.target.value })} 
                                      className="bg-background border border-border p-1.5 rounded-lg text-[10px] font-bold outline-none w-32"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-black text-muted-foreground block">Type</label>
                                    <select 
                                      value={editLeaveForm.type} 
                                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, type: e.target.value })} 
                                      className="bg-background border border-border p-1.5 rounded-lg text-[10px] font-bold outline-none cursor-pointer"
                                    >
                                      <option value="Annual">Annual</option>
                                      <option value="Sick">Sick</option>
                                      <option value="Unpaid">Unpaid</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1 flex-1 min-w-[120px]">
                                    <label className="text-[7px] font-black text-muted-foreground block">Reason</label>
                                    <input 
                                      type="text" 
                                      value={editLeaveForm.reason || ""} 
                                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, reason: e.target.value })} 
                                      placeholder="Reason for leave..."
                                      className="bg-background border border-border p-1.5 rounded-lg text-[10px] font-bold outline-none w-full"
                                    />
                                  </div>
                                  <div className="flex gap-2 ml-auto">
                                    <button 
                                      type="submit" 
                                      disabled={isUpdatingLeave}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[9px] font-black transition-colors disabled:opacity-50"
                                    >
                                      {isUpdatingLeave ? "Saving..." : "Save"}
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => setEditingLeaveId(null)}
                                      className="bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-lg text-[9px] font-black transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              </td>
                            ) : (
                              // VIEW MODE
                              <>
                                <td className="p-6">
                                  {new Date(leave.startDate).toLocaleDateString('en-GB')} - {new Date(leave.endDate).toLocaleDateString('en-GB')}
                                </td>
                                <td className="p-6">
                                  <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded text-[9px] font-black">{leave.type}</span>
                                </td>
                                <td className="p-6">
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    {leave.reason || "—"}
                                  </span>
                                </td>
                                <td className="p-6">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : leave.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                    {leave.status || 'PENDING'}
                                  </span>
                                </td>
                                <td className="p-6">
                                  <div className="text-[9px] text-muted-foreground">
                                    {leave.approval?.decider?.name || leave.approvedBy || '—'}
                                    {leave.approval?.decidedAt && (
                                      <span className="block text-[8px]">
                                        {new Date(leave.approval.decidedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {(leave.status === 'PENDING' || !leave.status) && (
                                      <div className="flex gap-1.5 border-r border-border pr-2 mr-1">
                                        <button
                                          onClick={() => handleQuickStatusUpdate(leave, "APPROVED")}
                                          title="Approve Leave"
                                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-lg text-emerald-600 transition-colors"
                                        >
                                          <Check size={12} className="stroke-[3]" />
                                        </button>
                                        <button
                                          onClick={() => handleQuickStatusUpdate(leave, "REJECTED")}
                                          title="Reject Leave"
                                          className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-red-600 transition-colors"
                                        >
                                          <X size={12} className="stroke-[3]" />
                                        </button>
                                      </div>
                                    )}
                                    {leave.status === 'APPROVED' && (
                                      <span className="text-[9px] text-emerald-600 font-bold mr-1">✓ Approved</span>
                                    )}
                                    {leave.status === 'REJECTED' && (
                                      <span className="text-[9px] text-red-600 font-bold mr-1">✗ Rejected</span>
                                    )}
                                    {/* Edit Button - Only show for PENDING leaves */}
                                    {(leave.status === 'PENDING' || !leave.status) && (
                                      <button
                                        onClick={() => {
                                          setEditingLeaveId(leave.id);
                                          setEditLeaveForm({
                                            startDate: new Date(leave.startDate).toISOString().split('T')[0],
                                            endDate: new Date(leave.endDate).toISOString().split('T')[0],
                                            type: leave.type,
                                            reason: leave.reason || "",
                                            status: leave.status || "PENDING",
                                          });
                                        }}
                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-lg text-blue-600 transition-colors"
                                        title="Edit Leave"
                                      >
                                        <Edit size={12} className="stroke-[3]" />
                                      </button>
                                    )}
                                    {/* Delete Button - Only show for PENDING leaves */}
                                    {(leave.status === 'PENDING' || !leave.status) && (
                                      <button
                                        onClick={() => handleDeleteLeave(leave.id)}
                                        className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-red-600 transition-colors"
                                        title="Delete Leave"
                                      >
                                        <TrashIcon size={12} className="stroke-[3]" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} className="p-20 text-center text-muted-foreground text-[10px] font-black uppercase italic">No leave records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL OVERLAY */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background h-full shadow-2xl p-8 border-l border-border flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Edit Personnel</h2>
              <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground uppercase text-[10px] font-black">Close</button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Full Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">System Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Designation</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none">
                    <option value="ADMIN">ADMIN</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="CREATIVE">CREATIVE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Employment Type</label>
                  <select value={editForm.userType} onChange={(e) => setEditForm({...editForm, userType: e.target.value})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none">
                    <option value="FULL_TIME">FULL TIME</option>
                    <option value="PART_TIME">PART TIME</option>
                    <option value="FREELANCER">FREELANCER</option>
                    <option value="INTERN">INTERN</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Monthly Salary</label>
                  <input type="number" value={editForm.baseSalary} onChange={(e) => setEditForm({...editForm, baseSalary: Number(e.target.value)})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Efficiency Rate</label>
                  <input type="number" step="0.1" value={editForm.efficiencyRate} onChange={(e) => setEditForm({...editForm, efficiencyRate: Number(e.target.value)})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">New Password (leave blank to keep current)</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" placeholder="••••••••" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Verified Skills (Comma separated)</label>
                <textarea
                  value={editForm.verifiedSkills.join(", ")}
                  onChange={(e) => setEditForm({...editForm, verifiedSkills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})}
                  className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none min-h-[80px]"
                />
              </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full p-4 mt-6 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50">
              {isSaving ? "Syncing to Ledger..." : "Sync Changes to Ledger"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}