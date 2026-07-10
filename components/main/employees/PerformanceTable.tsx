"use client";

import React from "react";
import { Users } from "lucide-react";

export interface EmployeePerformance {
  name: string;
  skills: string[];
  tasksCompleted: number;
  tasksCount: number;
  revenueGenerated: number;
  workingHours: number;
  lateDays: number;
  baseSalary: number;
  commissions: number;    
  overtime: number;       
  deductions: number;     // Added to track negative transactional values
  extraPayouts: number;   
  expenses: number;       
  efficiency: number;
  activeLeaves: number;
  walletBalance: number;  
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
              <th className="px-4">Comp. Breakdown</th>
              <th className="px-4 text-rose-500">Total Deductions</th>
              <th className="px-4">Wallet Balance</th>
              <th className="px-4">Efficiency</th>
              <th className="px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((emp, i) => (
              <tr key={i} className="bg-muted/20 hover:bg-muted/40 transition-colors group">
                {/* Operator Identity & Skills */}
                <td className="px-4 py-4 rounded-l-2xl min-w-[180px]">
                  <p className="font-black italic uppercase text-sm">{emp.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emp.skills.length > 0 ? (
                      emp.skills.map((skill) => (
                        <span key={skill} className="bg-primary/10 text-primary text-[7px] px-1 rounded font-bold uppercase">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[7px] opacity-30 italic">No Registered Skills</span>
                    )}
                  </div>
                </td>

                {/* Tasks */}
                <td className="px-4 py-4 font-bold text-sm">
                  <div className="flex flex-col">
                    <span>{emp.tasksCompleted} / {emp.tasksCount}</span>
                    <span className="text-[7px] opacity-40 font-black uppercase">Completed</span>
                  </div>
                </td>

                {/* Revenue */}
                <td className="px-4 py-4 font-black text-emerald-500 text-sm">
                  ${emp.revenueGenerated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Hours / Late */}
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{emp.workingHours}h</span>
                    <span className={`text-[8px] font-black ${emp.lateDays > 0 ? 'text-orange-500' : 'opacity-30'}`}>
                      {emp.lateDays} LATE DAYS
                    </span>
                  </div>
                </td>

                {/* Payroll Breakdown */}
                <td className="px-4 py-4 text-[11px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between gap-4">
                      <span className="opacity-40">Base:</span>
                      <span className="font-bold">${emp.baseSalary.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-emerald-500 font-medium">
                      <span className="opacity-50">Comm:</span>
                      <span>+${emp.commissions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-blue-400 font-medium">
                      <span className="opacity-50">OT:</span>
                      <span>+${emp.overtime.toFixed(2)}</span>
                    </div>
                  </div>
                </td>

                {/* Total Deductions (New Column Placement) */}
                <td className="px-4 py-4 font-mono font-bold text-xs text-rose-500">
                  -${Math.abs(emp.deductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Wallet Balance */}
                <td className="px-4 py-4 font-mono font-bold text-xs text-amber-500">
                  ${emp.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Efficiency Rate */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">{Math.round(emp.efficiency * 100)}%</span>
                    <div className="w-16 bg-background h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${Math.min(emp.efficiency * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Leave Status */}
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