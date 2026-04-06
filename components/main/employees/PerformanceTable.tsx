"use client";

import React from "react";
import { Users } from "lucide-react";

interface EmployeePerformance {
  name: string;
  skills: string[];
  tasksCompleted: number;
  tasksCount: number;
  revenueGenerated: number;
  workingHours: number;
  lateDays: number;
  baseSalary: number;
  extraPayouts: number;
  expenses: number;
  efficiency: number;
  activeLeaves: number;
}

interface PerformanceTableProps {
  performanceData: EmployeePerformance[];
}

export default function PerformanceTable({ performanceData }: PerformanceTableProps) {
  return (
    <section className="bg-card border border-border rounded-[3rem] p-8 shadow-xl overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
        <Users size={14} className="text-primary" /> Human Capital Performance Terminal
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[9px] font-black uppercase opacity-40">
              <th className="px-4">Operator / Skills</th>
              <th className="px-4">Tasks</th>
              <th className="px-4">Revenue</th>
              <th className="px-4">Hours/Late</th>
              <th className="px-4">Salary/Payout</th>
              <th className="px-4 text-rose-500">Expenses</th>
              <th className="px-4">Efficiency</th>
              <th className="px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((emp, i) => (
              <tr key={i} className="bg-muted/20 hover:bg-muted/40 transition-colors group">
                {/* Name & Skills */}
                <td className="px-4 py-4 rounded-l-2xl min-w-[150px]">
                  <p className="font-black italic uppercase text-sm">{emp.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emp.skills.map((skill) => (
                      <span key={skill} className="bg-primary/10 text-primary text-[7px] px-1 rounded font-bold uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Tasks */}
                <td className="px-4 py-4 font-bold text-sm">
                  {emp.tasksCompleted} / {emp.tasksCount}
                </td>

                {/* Revenue */}
                <td className="px-4 py-4 font-black text-emerald-500">
                  ${emp.revenueGenerated}
                </td>

                {/* Hours & Late */}
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{emp.workingHours}h</span>
                    <span className={`text-[8px] font-black ${emp.lateDays > 0 ? 'text-orange-500' : 'opacity-30'}`}>
                      {emp.lateDays} LATE DAYS
                    </span>
                  </div>
                </td>

                {/* Salary & Payouts */}
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold opacity-70">${emp.baseSalary}</span>
                    <span className="text-[8px] font-black text-primary italic">+${emp.extraPayouts} PAYOUT</span>
                  </div>
                </td>

                {/* Expenses */}
                <td className="px-4 py-4 font-bold text-rose-500 text-sm">
                  ${emp.expenses}
                </td>

                {/* Efficiency */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">{Math.round(emp.efficiency * 100)}%</span>
                    <div className="w-16 bg-background h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${emp.efficiency * 100}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Leaves */}
                <td className="px-4 py-4 rounded-r-2xl text-right">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${emp.activeLeaves > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {emp.activeLeaves} Leaves
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}