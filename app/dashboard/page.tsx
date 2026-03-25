"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Plane, CheckCircle2, AlertCircle } from "lucide-react";

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); // State for the live clock
  const [leaveForm, setLeaveForm] = useState({ start: "", end: "", type: "ANNUAL" });

  // 1. LIVE CLOCK LOGIC
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  // 2. Handle Attendance Toggle
  const handlePunch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      alert("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Leave Submission
  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leaves/request", {
        method: "POST",
        body: JSON.stringify({
          startDate: leaveForm.start,
          endDate: leaveForm.end,
          type: leaveForm.type,
        }),
      });
      if (res.ok) alert("Leave Requested!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10 min-h-screen bg-background">
      <header>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter">Self-Service Portal</h1>
        <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mt-2">Personal Management • Terminal v1.0</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* ATTENDANCE CARD */}
        <section className="bg-card border border-border p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-primary"/> Attendance Punch
            </h3>
            <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-1 rounded uppercase">Live Session</span>
          </div>

          <div className="space-y-6">
            <div className="text-center py-6">
               <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Current System Time</p>
               {/* This now uses the state variable that updates every second */}
               <p className="text-4xl font-black italic">{currentTime.toLocaleTimeString()}</p>
            </div>
            
            <button 
              onClick={handlePunch}
              disabled={loading}
              className={`w-full py-6 rounded-2xl font-black uppercase italic text-lg tracking-tighter transition-all shadow-xl
                ${loading ? "bg-muted animate-pulse cursor-not-allowed" : "bg-primary text-white hover:scale-[1.02] shadow-primary/20"}
              `}
            >
              {loading ? "Syncing..." : "Toggle Punch In/Out"}
            </button>
          </div>
        </section>

        {/* LEAVE REQUEST CARD */}
        <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <Plane size={14} className="text-primary"/> Request Time Off
          </h3>

          <form onSubmit={submitLeave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-muted-foreground">Start Date</label>
                <input 
                   type="date" 
                   required
                   onChange={(e) => setLeaveForm({...leaveForm, start: e.target.value})}
                   className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-primary/20" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-muted-foreground">End Date</label>
                <input 
                   type="date" 
                   required
                   onChange={(e) => setLeaveForm({...leaveForm, end: e.target.value})}
                   className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-primary/20" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-muted-foreground">Leave Category</label>
              <select 
                onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                className="w-full bg-muted/30 border border-border p-3 rounded-xl font-bold text-xs outline-none appearance-none"
              >
                <option value="ANNUAL">Annual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all mt-4 disabled:opacity-50"
            >
              Submit for Approval
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}