// lib/pdf/project-report-generator.ts
import { DocumentBuilder, DocumentOptions, DocumentSection } from "./document-builder";

export interface ProjectReportData {
  projectName: string;
  projectNo: string | null;
  status: string;
  clientName: string | null;
  totalValue: number;
  currency: string;
  summary: {
    totalPlannedExpenses: number;
    totalActualExpenses: number;
    totalBudgetVariance: number;
    totalHoursLogged: number;
    billableHours: number;
    nonBillableHours: number;
    budgetUtilization: number;
  };
  plannedExpenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  actualExpenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  budgetVariance: {
    total: number;
    byTask: Array<{
      taskTitle: string | null;
      budget: number;
      actual: number;
      variance: number;
    }>;
  };
  hours: {
    total: number;
    billable: number;
    nonBillable: number;
    byUser: Array<{ name: string; hours: number; billable: number }>;
  };
  milestones: Array<{
    name: string;
    budget: number;
    actualExpenses: number;
    variance: number;
    status: string;
    progress: number;
  }>;
  generatedAt: string;
  agencyName?: string;
}

export class ProjectReportGenerator {
  private data: ProjectReportData;

  constructor(data: ProjectReportData) {
    this.data = data;
  }

  private formatCurrency(value: number): string {
    const currency = this.data.currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatHours(value: number): string {
    return `${value.toFixed(1)}h`;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ACTIVE: "Active",
      COMPLETED: "Completed",
      PENDING: "Pending",
      ON_HOLD: "On Hold",
      CANCELLED: "Cancelled",
      ARCHIVED: "Archived",
    };
    return colors[status] || status;
  }

  public generate(): DocumentBuilder {
    const { data } = this;
    const currency = data.currency || "USD";

    const sections: DocumentSection[] = [];

    // ─── 1. Financial Summary Section ──────────────────────────────────────
    const summaryRows: (string | number)[][] = [
      ["Total Budget", this.formatCurrency(data.totalValue)],
      ["Total Planned Expenses", this.formatCurrency(data.summary.totalPlannedExpenses)],
      ["Total Actual Expenses", this.formatCurrency(data.summary.totalActualExpenses)],
      ["Budget Variance", this.formatCurrency(data.summary.totalBudgetVariance)],
      ["Budget Utilization", `${data.summary.budgetUtilization.toFixed(1)}%`],
      ["Total Hours Logged", this.formatHours(data.summary.totalHoursLogged)],
      ["Billable Hours", this.formatHours(data.summary.billableHours)],
      ["Non-Billable Hours", this.formatHours(data.summary.nonBillableHours)],
    ];

    sections.push({
      title: "Financial Summary",
      content: "",
      type: "table",
      tableData: {
        headers: ["Metric", "Value"],
        rows: summaryRows,
      },
    });

    // ─── 2. Planned Expenses by Category ──────────────────────────────────
    const plannedCategories = Object.keys(data.plannedExpenses.byCategory);
    if (plannedCategories.length > 0) {
      const plannedRows = plannedCategories
        .sort((a, b) => data.plannedExpenses.byCategory[b] - data.plannedExpenses.byCategory[a])
        .map((category) => [
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
          this.formatCurrency(data.plannedExpenses.byCategory[category]),
        ]);

      sections.push({
        title: "Planned Expenses by Category",
        content: "",
        type: "table",
        tableData: {
          headers: ["Category", "Amount"],
          rows: plannedRows,
        },
      });
    }

    // ─── 3. Actual Expenses by Category ──────────────────────────────────
    const actualCategories = Object.keys(data.actualExpenses.byCategory);
    if (actualCategories.length > 0) {
      const actualRows = actualCategories
        .sort((a, b) => data.actualExpenses.byCategory[b] - data.actualExpenses.byCategory[a])
        .map((category) => [
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
          this.formatCurrency(data.actualExpenses.byCategory[category]),
        ]);

      sections.push({
        title: "Actual Expenses by Category",
        content: "",
        type: "table",
        tableData: {
          headers: ["Category", "Amount"],
          rows: actualRows,
        },
      });
    }

    // ─── 4. Budget Variance by Task ──────────────────────────────────────
    if (data.budgetVariance.byTask.length > 0) {
      const varianceRows = data.budgetVariance.byTask.map((task) => [
        task.taskTitle || "Untitled Task",
        this.formatCurrency(task.budget),
        this.formatCurrency(task.actual),
        this.formatCurrency(task.variance),
      ]);

      sections.push({
        title: "Budget Variance by Task",
        content: "",
        type: "table",
        tableData: {
          headers: ["Task", "Budget", "Actual", "Variance"],
          rows: varianceRows,
        },
      });
    }

    // ─── 5. Hours by User ─────────────────────────────────────────────────
    if (data.hours.byUser.length > 0) {
      const hoursRows = data.hours.byUser.map((user) => [
        user.name,
        this.formatHours(user.hours),
        this.formatHours(user.billable),
      ]);

      sections.push({
        title: "Hours by User",
        content: "",
        type: "table",
        tableData: {
          headers: ["User", "Total Hours", "Billable Hours"],
          rows: hoursRows,
        },
      });
    }

    // ─── 6. Milestone Budget Tracking ────────────────────────────────────
    if (data.milestones.length > 0) {
      const milestoneRows = data.milestones.map((milestone) => [
        milestone.name,
        this.formatCurrency(milestone.budget),
        this.formatCurrency(milestone.actualExpenses),
        this.formatCurrency(milestone.variance),
        milestone.status || "PENDING",
        `${milestone.progress || 0}%`,
      ]);

      sections.push({
        title: "Milestone Budget Tracking",
        content: "",
        type: "table",
        tableData: {
          headers: ["Milestone", "Budget", "Actual", "Variance", "Status", "Progress"],
          rows: milestoneRows,
        },
      });
    }

    // ─── 7. Notes Section ──────────────────────────────────────────────────
    sections.push({
      title: "Notes",
      content: [
        "This report was automatically generated by Agency OS.",
        `Generated at: ${new Date(data.generatedAt).toLocaleString()}`,
        `All figures are in ${currency}.`,
      ],
      type: "text",
    });

    // ─── Build Document Options ──────────────────────────────────────────
    // ✅ Remove the duplicate overview - the header already shows this info
    const documentOptions: DocumentOptions = {
      title: "Project Financial Report",
      subtitle: data.projectName,
      companyName: data.agencyName || "Agency OS",
      footer: "Generated by Agency OS - Confidential",
      sections,
      metadata: {
        "Status": this.getStatusColor(data.status),
        "Client": data.clientName || "N/A",
        "Project #": data.projectNo || "N/A",
      },
    };

    return new DocumentBuilder(documentOptions);
  }

  public save(filename: string): void {
    this.generate().save(filename);
  }

  public getBlob(): Blob {
    return this.generate().getBlob();
  }

  public getUint8Array(): Uint8Array {
    return this.generate().getUint8Array();
  }
}

export async function generateProjectReportPdf(reportData: ProjectReportData): Promise<Uint8Array> {
  const generator = new ProjectReportGenerator(reportData);
  return generator.getUint8Array();
}