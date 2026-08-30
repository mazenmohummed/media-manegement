// components/payroll/PayrollDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, Clock, Users, TrendingUp, 
  AlertCircle, CheckCircle, Calendar, Download,
  Loader2
} from "lucide-react";

interface PayrollSummary {
  totalEmployees: number;
  totalHours: number;
  avgHoursPerEmployee: number;
  totalLateDays: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalOvertimeHours: number;
  attendanceRate: number;
  latePercentage: number;
}

export default function PayrollDashboard({ agencyId }: { agencyId: string }) {
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceMetrics();
  }, [agencyId, selectedMonth, selectedYear]);

  const fetchAttendanceMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/metrics?days=30`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async () => {
    if (!confirm("Process payroll for the selected month?")) return;
    
    try {
      const res = await fetch("/api/payroll/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });
      
      if (res.ok) {
        alert("Payroll processed successfully!");
        fetchAttendanceMetrics();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process payroll");
      }
    } catch (err) {
      console.error("Payroll processing error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!summary) {
    return <div className="p-12 text-center">No attendance data available</div>;
  }

  const metrics = [
    {
      label: "Total Hours",
      value: summary.totalHours.toFixed(1),
      icon: Clock,
      color: "text-blue-500",
    },
    {
      label: "Avg Hours/Employee",
      value: summary.avgHoursPerEmployee.toFixed(1),
      icon: Users,
      color: "text-purple-500",
    },
    {
      label: "Attendance Rate",
      value: `${summary.attendanceRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: summary.attendanceRate > 80 ? "text-emerald-500" : "text-amber-500",
    },
    {
      label: "Late Percentage",
      value: `${summary.latePercentage.toFixed(1)}%`,
      icon: AlertCircle,
      color: summary.latePercentage > 20 ? "text-rose-500" : "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Payroll Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            {new Date(selectedYear, selectedMonth).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-card border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleDateString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-card border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
          <button
            onClick={processPayroll}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Process Payroll
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card border border-border p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {metric.label}
              </span>
              <metric.icon size={18} className={metric.color} />
            </div>
            <p className="text-3xl font-black italic">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
            Attendance Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Present Days</span>
              <span className="text-sm font-bold text-emerald-500">
                {summary.totalPresentDays}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Absent Days</span>
              <span className="text-sm font-bold text-rose-500">
                {summary.totalAbsentDays}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Late Days</span>
              <span className="text-sm font-bold text-amber-500">
                {summary.totalLateDays}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Overtime Hours</span>
              <span className="text-sm font-bold text-purple-500">
                {summary.totalOvertimeHours.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-xs font-bold uppercase">Export Report</span>
              <Download size={16} />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-xs font-bold uppercase">View Employee Payroll</span>
              <Users size={16} />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-xs font-bold uppercase">Generate Payslips</span>
              <Calendar size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}