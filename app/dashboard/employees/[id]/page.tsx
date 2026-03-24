"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock, DollarSign, Zap } from "lucide-react";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployee() {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      setEmployee(data);
      setLoading(false);
    }
    fetchEmployee();
  }, [id]);

  if (loading) return <div className="p-10 font-black uppercase animate-pulse">Loading Profile...</div>;
  if (!employee) return <div className="p-10 font-black">Employee Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
      
      {/* PROFILE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border pb-12">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center text-4xl font-black italic">
            {employee.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
              {employee.name}
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-3">
              {employee.role} — {employee?.userType?.replace("_", " ") || "N/A"}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-card border border-border px-8 py-4 rounded-2xl text-center">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Efficiency</p>
            <p className="text-2xl font-black font-mono">{(employee.efficiencyRate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT COL: STATS & SKILLS */}
        <div className="space-y-10">
          <section className="bg-slate-950 text-white p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">Verified Stack</h3>
            <div className="flex flex-wrap gap-2">
              {employee.verifiedSkills.map((skill: string) => (
                <span key={skill} className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Contact Registry</h3>
            <div className="space-y-4">
                <div>
                    <p className="text-[8px] font-black uppercase text-muted-foreground">Digital Mail</p>
                    <p className="font-bold text-sm">{employee.email}</p>
                </div>
                <div>
                    <p className="text-[8px] font-black uppercase text-muted-foreground">Internal ID</p>
                    <p className="font-mono text-xs">{employee.userNo || employee.id}</p>
                </div>
            </div>
          </section>
        </div>

        {/* RIGHT COL: PRODUCTION LEDGER & ATTENDANCE */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* ACTIVE TASKS */}
          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Production Ledger
                </h3>
            </div>
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase text-muted-foreground">
                        <tr>
                            <th className="p-6">Project</th>
                            <th className="p-6">Progress</th>
                            <th className="p-6 text-right">Revenue Share</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {employee.tasks.map((task: any) => (
                            <tr key={task.id} className="group hover:bg-muted/30 transition-colors">
                                <td className="p-6">
                                    <p className="font-black text-sm uppercase">{task.project.projectName}</p>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase">{task.taskType}</p>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-foreground" style={{ width: `${task.progress}%` }} />
                                        </div>
                                        <span className="font-mono text-[10px] font-black">{task.progress}%</span>
                                    </div>
                                </td>
                                <td className="p-6 text-right font-mono font-black text-sm">
                                    ${task.grossRevenue.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </section>

          {/* ATTENDANCE QUICK VIEW */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 px-2 text-muted-foreground">
                <Clock className="w-3 h-3" /> Recent Activity Log
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {employee.attendanceLogs.map((log: any) => (
                    <div key={log.id} className="bg-card border border-border p-5 rounded-2xl text-center">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">
                            {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className="text-[10px] font-black uppercase">{log.status}</p>
                    </div>
                ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}