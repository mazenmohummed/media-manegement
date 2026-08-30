// components/projects/ProjectReportingDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Briefcase,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  PieChart,
  BarChart3,
  FileText,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReportingData {
  project: {
    id: string;
    name: string;
    projectName: string;
    projectNo: string | null;
    status: string;
    totalValue: number;
    currency: string;
    client: { id: string; clientName: string } | null;
    tags: { id: string; name: string; color: string }[];
    _count: { tasks: number; milestones: number };
  };
  summary: {
    totalPlannedExpenses: number;
    totalActualExpenses: number;
    totalBudgetVariance: number;
    totalHoursLogged: number;
    billableHours: number;
    nonBillableHours: number;
    averageBillableRate: number;
    expenseVariancePercentage: number;
    totalBudget: number;
    budgetUtilization: number;
  };
  plannedExpenses: {
    total: number;
    byCategory: Record<string, number>;
    byTask: Array<{
      taskId: string;
      taskTitle: string | null;
      totalEstimated: number;
      status: string;
      items: Array<{
        id: string;
        itemName: string;
        category: string;
        estimatedCost: number;
        approvedCost: number | null;
        status: string;
        quantity: number;
        unitCost: number;
        taxRate: number;
        totalEstimated: number;
      }>;
    }>;
  };
  actualExpenses: {
    total: number;
    byCategory: Record<string, number>;
    byTask: Array<{
      taskId: string;
      taskTitle: string | null;
      totalCost: number;
      status: string;
      items: Array<{
        id: string;
        itemName: string;
        category: string;
        cost: number;
        status: string;
        reimbursable: boolean;
        incurredAt: string | null;
        receiptUrl: string | null;
      }>;
    }>;
  };
  hours: {
    total: number;
    billable: number;
    nonBillable: number;
    byTask: Array<{
      taskId: string;
      taskTitle: string | null;
      hours: number;
      billable: number;
      nonBillable: number;
    }>;
    byUser: Array<{
      name: string;
      hours: number;
      billable: number;
      nonBillable: number;
    }>;
  };
  budgetVariance: {
    total: number;
    byTask: Array<{
      taskId: string;
      taskTitle: string | null;
      budget: number;
      actual: number;
      variance: number;
    }>;
  };
  milestones: Array<{
    id: string;
    name: string;
    budget: number;
    actualExpenses: number;
    variance: number;
    status: string;
    deadline: string | null;
    progress: number;
  }>;
  timestamp: string;
}

interface ProjectReportingDashboardProps {
  projectId: string;
}

export function ProjectReportingDashboard({ projectId }: ProjectReportingDashboardProps) {
  const [data, setData] = useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReportingData = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/reporting`);
        if (res.ok) {
          const result = await res.json();
          setData(result.data);
        } else {
          const err = await res.json();
          setError(err.error || "Failed to load reporting data");
        }
      } catch (err) {
        console.error("Failed to fetch reporting data:", err);
        setError("Failed to load reporting data");
      } finally {
        setLoading(false);
      }
    };

    fetchReportingData();
  }, [projectId]);

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reporting/export`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `project-report-${data?.project?.projectNo || projectId}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) {
          filename = match[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { project, summary, plannedExpenses, actualExpenses, hours, budgetVariance, milestones } = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: project.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-zinc-700 text-zinc-300 border-zinc-600",
      ACTIVE: "bg-blue-950/40 text-blue-400 border-blue-800",
      IN_REVIEW: "bg-amber-950/40 text-amber-400 border-amber-800",
      COMPLETED: "bg-emerald-950/40 text-emerald-400 border-emerald-800",
      CANCELLED: "bg-red-950/40 text-red-400 border-red-800",
      ARCHIVED: "bg-purple-950/40 text-purple-400 border-purple-800",
    };
    return colors[status] || colors.PENDING;
  };

  const isVarianceGood = (variance: number) => variance >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              {project.projectName || project.name}
            </h2>
            <p className="text-sm text-zinc-400">
              {project.projectNo || project.id.slice(0, 8)} • {project.client?.clientName || "No client"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={handleExportReport}
              disabled={exporting || loading}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1.5" />
              )}
              {exporting ? "Generating..." : "Export Report"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-zinc-800">
          {project.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${tag.color}25`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
          ))}
          <span className="text-xs text-zinc-500">
            {project._count.milestones} milestones • {project._count.tasks} tasks
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Total Budget
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {formatCurrency(summary.totalBudget)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {summary.budgetUtilization.toFixed(1)}% utilized
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Actual vs Planned
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {formatCurrency(summary.totalActualExpenses)}
          </p>
          <p className={`text-[10px] ${summary.expenseVariancePercentage <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {summary.expenseVariancePercentage > 0 ? '+' : ''}{summary.expenseVariancePercentage.toFixed(1)}% variance
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Clock className="w-4 h-4 text-purple-400" />
            Hours Logged
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {formatHours(summary.totalHoursLogged)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {formatHours(summary.billableHours)} billable
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Briefcase className="w-4 h-4 text-amber-400" />
            Budget Variance
          </div>
          <p className={`text-2xl font-bold ${isVarianceGood(summary.totalBudgetVariance) ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(summary.totalBudgetVariance)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {isVarianceGood(summary.totalBudgetVariance) ? 'Under budget' : 'Over budget'}
          </p>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planned Expenses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Planned Expenses
            <span className="ml-auto text-xs text-zinc-500">
              {formatCurrency(plannedExpenses.total)}
            </span>
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {Object.entries(plannedExpenses.byCategory).length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No planned expenses</p>
            ) : (
              Object.entries(plannedExpenses.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-xs text-zinc-400 capitalize">{category.toLowerCase()}</span>
                    <span className="text-xs font-medium text-zinc-200">{formatCurrency(amount)}</span>
                  </div>
                ))
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Total Planned</span>
              <span className="text-xs font-bold text-blue-400">{formatCurrency(plannedExpenses.total)}</span>
            </div>
          </div>
        </div>

        {/* Actual Expenses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            Actual Expenses
            <span className="ml-auto text-xs text-zinc-500">
              {formatCurrency(actualExpenses.total)}
            </span>
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {Object.entries(actualExpenses.byCategory).length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No actual expenses</p>
            ) : (
              Object.entries(actualExpenses.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-xs text-zinc-400 capitalize">{category.toLowerCase()}</span>
                    <span className="text-xs font-medium text-zinc-200">{formatCurrency(amount)}</span>
                  </div>
                ))
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Total Actual</span>
              <span className="text-xs font-bold text-emerald-400">{formatCurrency(actualExpenses.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hours Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Hours Breakdown
          <span className="ml-auto text-xs text-zinc-500">
            Total: {formatHours(hours.total)}
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Hours</p>
            <p className="text-lg font-bold text-zinc-100">{formatHours(hours.total)}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Billable</p>
            <p className="text-lg font-bold text-emerald-400">{formatHours(hours.billable)}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Non-Billable</p>
            <p className="text-lg font-bold text-amber-400">{formatHours(hours.nonBillable)}</p>
          </div>
        </div>
        {hours.byUser.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">By User</h4>
            <div className="space-y-1">
              {hours.byUser.map((user) => (
                <div key={user.name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{user.name}</span>
                  <span className="text-zinc-300">
                    {formatHours(user.hours)} ({formatHours(user.billable)} billable)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Budget Variance by Task */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Budget Variance by Task
        </h3>
        {budgetVariance.byTask.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No budget data available</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {budgetVariance.byTask.map((task) => (
              <div key={task.taskId} className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {task.taskTitle || task.taskId.slice(0, 8)}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>Budget: {formatCurrency(task.budget)}</span>
                    <span>Actual: {formatCurrency(task.actual)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-xs font-bold ${isVarianceGood(task.variance) ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(task.variance)}
                  </span>
                  {isVarianceGood(task.variance) ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">Total Variance</span>
            <span className={`text-xs font-bold ${isVarianceGood(budgetVariance.total) ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(budgetVariance.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Budget Tracking */}
      {milestones.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Milestone Budget Tracking
          </h3>
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{milestone.name}</span>
                    <Badge className={getStatusColor(milestone.status)}>
                      {milestone.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-500">{milestone.progress}% complete</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-zinc-500">Budget</p>
                    <p className="font-semibold text-zinc-200">{formatCurrency(milestone.budget)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Actual</p>
                    <p className="font-semibold text-zinc-200">{formatCurrency(milestone.actualExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Variance</p>
                    <p className={`font-semibold ${isVarianceGood(milestone.variance) ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(milestone.variance)}
                    </p>
                  </div>
                </div>
                {milestone.deadline && (
                  <p className="text-[10px] text-zinc-500 mt-2">
                    Deadline: {new Date(milestone.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-zinc-600">
        Report generated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}