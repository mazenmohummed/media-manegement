"use client";

import React, { useState } from "react";

// --- INTERFACES ---
interface ServiceDetail {
  employee: string;
  isFreelancer: boolean;
  salary: string;
}

interface Project {
  id: number;
  projectName: string;
  clientName: string;
  budget: number;
  services: Record<string, ServiceDetail>;
}

interface InternalEmployee {
  id: number;
  name: string;
  role: string;
  monthlySalary: number;
}

export default function FinancePage() {
  // --- STATE ---
  const [projects] = useState<Project[]>([
    {
      id: 1,
      projectName: "Summer Campaign",
      clientName: "Nike",
      budget: 5000,
      services: {
        "Reals": { employee: "John Doe", isFreelancer: true, salary: "1200" },
        "Design": { employee: "Sarah Staff", isFreelancer: false, salary: "0" },
        "Copy Writer": { employee: "Jane Smith", isFreelancer: true, salary: "450" }
      }
    },
    {
      id: 2,
      projectName: "Social Blitz",
      clientName: "Coca Cola",
      budget: 3500,
      services: {
        "Photo": { employee: "Mike Ross", isFreelancer: true, salary: "900" }
      }
    }
  ]);

  const [employees] = useState<InternalEmployee[]>([
    { id: 1, name: "Sarah Jenkins", role: "Lead Designer", monthlySalary: 4500 },
    { id: 2, name: "Alex Rivera", role: "Project Manager", monthlySalary: 3800 },
    { id: 3, name: "Maria Chen", role: "Copywriter", monthlySalary: 3200 },
  ]);

  // --- CALCULATIONS ---
  
  // 1. Flatten all freelance payments into a single list
  const freelancePayments = projects.flatMap(project => 
    Object.entries(project.services)
      .filter(([_, detail]) => detail.isFreelancer && Number(detail.salary) > 0)
      .map(([serviceName, detail]) => ({
        id: `${project.id}-${serviceName}`,
        freelancerName: detail.employee,
        service: serviceName,
        projectName: project.projectName,
        amount: Number(detail.salary)
      }))
  );

  const totalProjectRevenue = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalFreelanceExpenses = freelancePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalEmployeePayroll = employees.reduce((sum, e) => sum + e.monthlySalary, 0);
  
  const totalExpenses = totalFreelanceExpenses + totalEmployeePayroll;
  const netProfit = totalProjectRevenue - totalExpenses;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financial Reporting</h1>
          <p className="text-gray-500 text-sm">Real-time overview of revenue and outflows</p>
        </div>
        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-semibold">
          Feb 2026
        </span>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`$${totalProjectRevenue.toLocaleString()}`} color="text-blue-600" />
        <StatCard title="Staff Payroll" value={`$${totalEmployeePayroll.toLocaleString()}`} color="text-orange-600" subtitle="Fixed" />
        <StatCard title="Freelance Costs" value={`$${totalFreelanceExpenses.toLocaleString()}`} color="text-red-500" subtitle="Variable" />
        <StatCard title="Net Profit" value={`$${netProfit.toLocaleString()}`} color={netProfit >= 0 ? "text-green-600" : "text-red-600"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- INTERNAL PAYROLL --- */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 h-fit overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-800">Internal Staff</div>
          <div className="p-4 space-y-4">
            {employees.map((emp) => (
              <div key={emp.id} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                <div>
                  <div className="font-bold text-gray-800 text-sm">{emp.name}</div>
                  <div className="text-xs text-gray-500">{emp.role}</div>
                </div>
                <div className="text-right font-mono font-bold text-gray-700">
                  ${emp.monthlySalary.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- PROJECT PERFORMANCE --- */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-800">Project Performance</div>
          <table className="w-full text-left">
            <thead className="bg-white text-[10px] uppercase text-gray-400 border-b">
              <tr>
                <th className="p-4">Project</th>
                <th className="p-4 text-right">Revenue</th>
                <th className="p-4 text-right">Freelance</th>
                <th className="p-4 text-right">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => {
                const costs = Object.values(p.services).reduce((s, d) => s + (Number(d.salary) || 0), 0);
                return (
                  <tr key={p.id} className="text-sm hover:bg-gray-50">
                    <td className="p-4 font-semibold text-gray-700">{p.projectName}</td>
                    <td className="p-4 text-right font-mono">${p.budget.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-red-400">-${costs.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-green-600">${(p.budget - costs).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FREELANCE LEDGER --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Freelance Payment Ledger</h2>
          <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-1 rounded">
            {freelancePayments.length} Active Payments
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-[10px] uppercase tracking-widest text-gray-400 border-b">
              <tr>
                <th className="p-4 font-semibold">Freelancer</th>
                <th className="p-4 font-semibold">Service</th>
                <th className="p-4 font-semibold">Project</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {freelancePayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-blue-50/30">
                  <td className="p-4 font-bold text-gray-700">{payment.freelancerName}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                      {payment.service}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{payment.projectName}</td>
                  <td className="p-4 text-right font-mono font-bold">${payment.amount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-bold text-orange-500 uppercase flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function StatCard({ title, value, color, subtitle }: { title: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-gray-400 uppercase mt-1 tracking-wider">{subtitle}</p>}
    </div>
  );
}