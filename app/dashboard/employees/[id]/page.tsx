"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Edit3, Trash2, UserCheck, Wallet, ArrowUpRight, ShieldCheck 
} from "lucide-react";

export default function EmployeeProfile() {
  const { id } = useParams();
  const router = useRouter();
  
  // --- CORE STATES ---
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TASKS" | "ATTENDANCE" | "LEAVES">("TASKS");
  const [isSaving, setIsSaving] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // --- EDIT MODAL STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "CREATIVE",
    userType: "FULL_TIME",
    salary: 0,
    email: "",
    password: "",
    verifiedSkills: [] as string[],
  });

  // --- FILTER STATES ---
  const [filterMode, setFilterMode] = useState<"PRESET" | "MONTH">("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // --- DATA FETCHING ---
  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      setEmployee(data);
      
      setEditForm({
        name: data.name || "",
        role: data.role || "CREATIVE",
        userType: data.userType || "FULL_TIME",
        salary: data.salary || 0,
        email: data.email || "",
        password: "", 
        verifiedSkills: data.verifiedSkills || [],
      });
    } catch (err) { 
      console.error("Failed to load employee profile", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
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
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/dashboard/employees"); 
    } catch (err) {
      console.error("Termination error:", err);
    } finally {
      setIsTerminating(false);
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
    const gross = filteredTasks.reduce((acc: number, t: any) => acc + (t.grossRevenue || 0), 0);
    const net = filteredTasks.reduce((acc: number, t: any) => {
      const margin = t.margin || 0;
      return acc + (t.grossRevenue * (margin / 100));
    }, 0);
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
             ${financeStats.gross.toLocaleString()}
           </h2>
           <p className="text-[9px] font-bold mt-2 uppercase opacity-70">Across {filteredTasks.length} Projects</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-[2rem] flex flex-col justify-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Agency Profit</p>
           <h2 className="text-4xl font-black italic tracking-tighter mt-1 text-emerald-600">
             ${financeStats.net.toLocaleString()}
           </h2>
        </div>

        <div className="bg-card border border-border p-6 rounded-[2rem] flex flex-col justify-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Efficiency Rating</p>
           <h2 className="text-4xl font-black italic tracking-tighter mt-1 text-blue-600">
             {(financeStats.gross / (employee.salary || 1)).toFixed(1)}x
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
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Monthly Salary</p>
                <p className="text-2xl font-black italic tracking-tighter">${employee.salary?.toLocaleString() || "0.00"}</p>
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

        {/* MIDDLE COLUMN: CONTENT TABS */}
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
                          <p className="text-sm font-black italic">${task.grossRevenue?.toLocaleString()}</p>
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
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <th className="p-6">Date</th>
                      <th className="p-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {employee.attendanceLogs?.map((log: any) => (
                      <tr key={log.id} className="text-[11px] font-bold uppercase hover:bg-muted/10 transition-colors">
                        <td className="p-6">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "LEAVES" && (
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <th className="p-6">Period</th>
                      <th className="p-6">Type</th>
                      <th className="p-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {employee.leaves?.length > 0 ? (
                      employee.leaves.map((leave: any, i: number) => (
                        <tr key={i} className="text-[11px] font-bold uppercase hover:bg-muted/10 transition-colors">
                          <td className="p-6">{new Date(leave.startDate).toLocaleDateString('en-GB')} - {new Date(leave.endDate).toLocaleDateString('en-GB')}</td>
                          <td className="p-6"><span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded text-[9px] font-black">{leave.type}</span></td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-20 text-center text-muted-foreground text-[10px] font-black uppercase italic">No leave records found</td></tr>
                    )}
                  </tbody>
                </table>
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
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Monthly Salary</label>
                  <input type="number" value={editForm.salary} onChange={(e) => setEditForm({...editForm, salary: Number(e.target.value)})} className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Verified Skills (Comma separated)</label>
                <textarea 
                  value={editForm.verifiedSkills.join(", ")} 
                  onChange={(e) => setEditForm({...editForm, verifiedSkills: e.target.value.split(",").map(s => s.trim())})}
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