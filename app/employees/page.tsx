"use client";

import Link from "next/link";
import React, { useState, useMemo } from "react";
import { Briefcase, Clock, CreditCard, Filter as FilterIcon, UserCheck } from "lucide-react";

// --- TYPES & CONSTANTS ---
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";
const CATEGORIES = ["Consultation", "Video", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"];

interface Task {
  id: string;
  projectName: string;
  employeeName: string;
  serviceType: string;
  fee: number;
  status: "In Progress" | "Completed";
  paymentStatus: "Paid" | "Pending";
  dueDate: string;
}

interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  type: "Work Day" | "Vacation" | "Public Holiday";
}

export default function AgencyOperationsPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "t1", projectName: "Nike Winter", employeeName: "Ahmed Hassan", serviceType: "Design", fee: 550, status: "Completed", paymentStatus: "Paid", dueDate: "2026-02-10" },
    { id: "t2", projectName: "TechCorp App", employeeName: "Ahmed Hassan", serviceType: "Design", fee: 400, status: "In Progress", paymentStatus: "Pending", dueDate: "2026-03-01" },
    { id: "t3", projectName: "Coca Cola Summer", employeeName: "Sara Jones", serviceType: "Photo", fee: 1250, status: "Completed", paymentStatus: "Pending", dueDate: "2026-02-15" },
    { id: "t4", projectName: "Puma Story", employeeName: "Sara Jones", serviceType: "Video", fee: 800, status: "Completed", paymentStatus: "Paid", dueDate: "2026-02-20" },
  ]);

  const [attendance] = useState<AttendanceRecord[]>([
    { id: "a1", employeeName: "Ahmed Hassan", date: "2026-03-06", checkIn: "09:00 AM", checkOut: "05:30 PM", type: "Work Day" },
    { id: "a2", employeeName: "Ahmed Hassan", date: "2026-03-07", checkIn: "-", checkOut: "-", type: "Vacation" },
    { id: "a3", employeeName: "Sara Jones", date: "2026-03-06", checkIn: "10:15 AM", checkOut: "07:00 PM", type: "Work Day" },
    { id: "a4", employeeName: "Sara Jones", date: "2026-03-07", checkIn: "09:00 AM", checkOut: "05:00 PM", type: "Work Day" },
  ]);

  // --- FILTER STATES ---
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // --- HELPERS ---
  const calculateHours = (inStr: string, outStr: string) => {
    if (inStr === "-" || outStr === "-") return 0;
    const parseTime = (t: string) => {
      const [time, modifier] = t.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return hours + minutes / 60;
    };
    return parseTime(outStr) - parseTime(inStr);
  };

  const employees = useMemo(() => {
    const names = Array.from(new Set(tasks.map(t => t.employeeName)));
    return names.map(name => {
      const empAttendance = attendance.filter(a => a.employeeName === name);
      const todayStatus = empAttendance.find(a => a.date === "2026-03-07")?.type;
      return {
        name,
        tasks: tasks.filter(t => t.employeeName === name),
        role: name === "Ahmed Hassan" ? "Senior Designer" : "Videographer",
        isAway: todayStatus === "Vacation"
      };
    });
  }, [tasks, attendance]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesCat = selectedCats.length === 0 || selectedCats.includes(task.serviceType);
      const taskDate = new Date(task.dueDate);
      let matchesDate = true;

      if (filterMode === "PRESET") {
        if (activePreset === "Q1") matchesDate = taskDate.getMonth() <= 2;
        if (activePreset === "Q2") matchesDate = taskDate.getMonth() >= 3 && taskDate.getMonth() <= 5;
      } else if (filterMode === "MONTH") {
        matchesDate = taskDate.getMonth() === parseInt(selectedMonth);
      } else if (filterMode === "CUSTOM") {
        const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
        const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
        matchesDate = taskDate.getTime() >= start && taskDate.getTime() <= end;
      }
      return matchesCat && matchesDate;
    });
  }, [tasks, selectedCats, filterMode, activePreset, selectedMonth, dateRange]);

  const togglePayment = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, paymentStatus: t.paymentStatus === "Paid" ? "Pending" : "Paid" } : t
    ));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-background min-h-screen text-foreground space-y-12">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Agency HQ</h1>
          <p className="text-muted-foreground font-medium text-sm">Financials, Attendance & Resource Planning</p>
        </div>
        <div className="text-left md:text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Agency Debt</p>
            <p className="text-2xl font-black font-mono text-orange-600">
                ${tasks.filter(t => t.paymentStatus === "Pending").reduce((s, t) => s + t.fee, 0).toLocaleString()}
            </p>
        </div>
      </header>

      {/* SECTION 1: EMPLOYEE SYNOPSIS */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <UserCheck className="w-3 h-3" /> Resource Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => {
            const pending = emp.tasks.filter(t => t.paymentStatus === "Pending").reduce((acc, t) => acc + t.fee, 0);
            return (
              <div key={emp.name} className={`bg-card border p-6 rounded-[2rem] shadow-sm flex flex-col justify-between group transition-all ${emp.isAway ? 'border-orange-500/30 bg-orange-500/5' : 'border-border hover:border-primary/30'}`}>
                <Link href="/employees/employee">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black uppercase tracking-tight">{emp.name}</h3>
                          {emp.isAway && <span className="px-2 py-0.5 rounded-full bg-orange-500 text-[8px] text-white font-black uppercase">Away</span>}
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{emp.role}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${emp.isAway ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                        {emp.name.charAt(0)}
                    </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-border">
                  <p className="text-[10px] font-black text-primary uppercase tracking-tighter">View Detailed Log</p>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-orange-500 uppercase mb-1">Pending Payout</p>
                    <p className="text-xl font-black font-mono text-foreground">${pending.toLocaleString()}</p>
                  </div>
                </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: ATTENDANCE LEDGER */}
      <section className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <Link href="/employees/attendance-vacation">
          <div className="p-6 bg-foreground flex justify-between items-center text-background">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-4 h-4" /> Attendance & Vacation History
              </h2>
          </div>
        </Link>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="p-6">Employee</th>
                  <th className="p-6">Date</th>
                  <th className="p-6">Check In</th>
                  <th className="p-6">Check Out</th>
                  <th className="p-6">Hours</th>
                  <th className="p-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((record) => {
                  const hours = calculateHours(record.checkIn, record.checkOut);
                  return (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-6 font-black text-foreground text-xs uppercase">{record.employeeName}</td>
                      <td className="p-6 text-[11px] font-bold text-muted-foreground">{record.date}</td>
                      <td className="p-6 font-mono text-xs text-foreground">{record.checkIn}</td>
                      <td className="p-6 font-mono text-xs text-foreground">{record.checkOut}</td>
                      <td className="p-6">
                        <span className="font-black text-foreground font-mono text-sm">{hours > 0 ? `${hours.toFixed(1)}h` : "—"}</span>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${record.type === 'Vacation' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {record.type}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </section>

      {/* SECTION 3: FILTER ENGINE */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-card border border-border p-6 rounded-[2rem] shadow-sm">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Service Departments</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCats.includes(cat) ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-background border-border text-muted-foreground hover:border-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filter Mode</h2>
            <div className="flex bg-muted p-1 rounded-xl border border-border w-fit">
              {(["PRESET", "MONTH", "CUSTOM"] as FilterMode[]).map((mode) => (
                <button key={mode} onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Timeline Selection</h2>
            <div className="flex flex-wrap items-center gap-4">
              {filterMode === "PRESET" && (
                <select value={activePreset} onChange={(e) => setActivePreset(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-primary/20 transition-all cursor-pointer text-foreground">
                  <option value="ALL">All Recorded Time</option>
                  <option value="Q1">Q1 (Jan — Mar)</option>
                  <option value="Q2">Q2 (Apr — Jun)</option>
                </select>
              )}
              {filterMode === "MONTH" && (
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer text-foreground">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              )}
              {filterMode === "CUSTOM" && (
                <div className="flex items-center gap-3">
                  <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] font-bold text-foreground" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                  <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">To</span>
                  <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] font-bold text-foreground" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TASK LEDGER */}
      <section className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden transition-colors">
        <div className="p-6 bg-muted border-b border-border flex justify-between items-center">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Task Ledger
            </h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Showing {filteredTasks.length} Results</p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="p-6">Project / Type</th>
                  <th className="p-6">Assignee</th>
                  <th className="p-6">Fee</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors group text-foreground">
                    <td className="p-6">
                      <p className="font-black text-foreground text-sm uppercase">{task.projectName}</p>
                      <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">{task.serviceType}</p>
                    </td>
                    <td className="p-6 text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{task.employeeName}</td>
                    <td className="p-6 font-mono font-black text-foreground">${task.fee.toLocaleString()}</td>
                    <td className="p-6 text-right">
                        <button onClick={() => togglePayment(task.id)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-2 ml-auto ${task.paymentStatus === "Paid" ? "bg-muted text-muted-foreground" : "bg-emerald-600 text-white shadow-emerald-500/20"}`}>
                            <CreditCard className="w-3 h-3" />
                            {task.paymentStatus === "Paid" ? "Undo Payment" : "Confirm Payout"}
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </section>
    </div>
  );
}