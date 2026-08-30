// app/api/projects/[projectId]/reporting/export/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { ProjectReportGenerator } from "@/lib/pdf/project-report-generator";

// ─── GET /api/projects/[projectId]/reporting/export ──────────────────────
export const GET = withAuthGuard("project:read", async (req: Request, { agencyId }, context) => {
  try {
    const params = await context.params;
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    // Fetch project with all related data
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: { deletedAt: null },
          include: {
            plannedExpenses: true,
            taskExpenses: true,
            taskSessions: {
              select: {
                totalDuration: true,
                isBillable: true,
                hourlyRate: true,
              },
            },
            assignees: {
              select: {
                id: true,
                name: true,
                efficiencyRate: true,
              },
            },
          },
        },
        milestones: {
          where: {
            // Milestones don't have deletedAt, so just filter by projectId
          },
          select: {
            id: true,
            name: true,
            budget: true,
            status: true,
            deadline: true,
          },
        },
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
        // Remove agency include since it doesn't exist on Project
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // ─── Calculate Reporting Metrics ──────────────────────────────────────

    // 1. Planned Expenses
    let totalPlannedExpenses = 0;
    const plannedExpensesByCategory: Record<string, number> = {};

    // 2. Actual Expenses
    let totalActualExpenses = 0;
    const actualExpensesByCategory: Record<string, number> = {};

    // 3. Hours Logged
    let totalHoursLogged = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const hoursByUser: Record<string, { name: string; hours: number; billable: number }> = {};

    // 4. Budget Variance
    let totalBudgetVariance = 0;
    const budgetVarianceByTask: Array<{
      taskTitle: string | null;
      budget: number;
      actual: number;
      variance: number;
    }> = [];

    // 5. Milestone Budget Tracking
    const milestoneBudgets: Array<{
      name: string;
      budget: number;
      actualExpenses: number;
      variance: number;
      status: string;
      progress: number;
    }> = [];

    // Process each task
    for (const task of project.tasks) {
      // ── Planned Expenses ──
      const taskPlanned = task.plannedExpenses || [];
      const taskPlannedTotal = taskPlanned.reduce((sum: number, exp: any) => sum + (exp.totalEstimated || exp.estimatedCost || 0), 0);
      totalPlannedExpenses += taskPlannedTotal;

      // Group planned expenses by category
      taskPlanned.forEach((exp: any) => {
        const category = exp.category || "OTHER";
        plannedExpensesByCategory[category] = (plannedExpensesByCategory[category] || 0) + (exp.totalEstimated || exp.estimatedCost || 0);
      });

      // ── Actual Expenses ──
      const taskActual = task.taskExpenses || [];
      const taskActualTotal = taskActual.reduce((sum: number, exp: any) => sum + (exp.cost || 0), 0);
      totalActualExpenses += taskActualTotal;

      // Group actual expenses by category
      taskActual.forEach((exp: any) => {
        const category = exp.category || "OTHER";
        actualExpensesByCategory[category] = (actualExpensesByCategory[category] || 0) + (exp.cost || 0);
      });

      // ── Hours Logged ──
      const taskSessions = task.taskSessions || [];
      let taskBillableHours = 0;
      let taskNonBillableHours = 0;

      taskSessions.forEach((session: any) => {
        const duration = session.totalDuration || 0;
        totalHoursLogged += duration;
        
        if (session.isBillable !== false) {
          taskBillableHours += duration;
        } else {
          taskNonBillableHours += duration;
        }
      });

      billableHours += taskBillableHours;
      nonBillableHours += taskNonBillableHours;

      // Group hours by assignee/user
      if (task.assignees && task.assignees.length > 0) {
        const hoursPerUser = taskSessions.length > 0 && task.assignees.length > 0
          ? (taskBillableHours + taskNonBillableHours) / task.assignees.length
          : 0;

        task.assignees.forEach((assignee: any) => {
          if (!hoursByUser[assignee.id]) {
            hoursByUser[assignee.id] = {
              name: assignee.name,
              hours: 0,
              billable: 0,
            };
          }
          hoursByUser[assignee.id].hours += hoursPerUser;
          hoursByUser[assignee.id].billable += (hoursPerUser * (taskBillableHours / (taskBillableHours + taskNonBillableHours || 1)));
        });
      }

      // ── Budget Variance ──
      const taskBudget = task.approvedBudget || 0;
      const taskActualCost = taskActualTotal;
      const taskVariance = taskBudget - taskActualCost;

      totalBudgetVariance += taskVariance;

      budgetVarianceByTask.push({
        taskTitle: task.title,
        budget: taskBudget,
        actual: taskActualCost,
        variance: taskVariance,
      });
    }

    // ── Milestone Budget Tracking ──
    for (const milestone of project.milestones) {
      // Get all tasks for this milestone
      const milestoneTasks = project.tasks.filter((t: any) => t.milestoneId === milestone.id);
      
      // Calculate actual expenses for tasks in this milestone
      let milestoneActualExpenses = 0;
      let completedTasks = 0;
      
      for (const task of milestoneTasks) {
        const taskActual = task.taskExpenses || [];
        milestoneActualExpenses += taskActual.reduce((sum: number, exp: any) => sum + (exp.cost || 0), 0);
        if (task.status === "COMPLETED") completedTasks++;
      }

      const milestoneBudget = milestone.budget || 0;
      const variance = milestoneBudget - milestoneActualExpenses;
      const progress = milestoneTasks.length > 0 ? Math.round((completedTasks / milestoneTasks.length) * 100) : 0;

      milestoneBudgets.push({
        name: milestone.name,
        budget: milestoneBudget,
        actualExpenses: milestoneActualExpenses,
        variance: variance,
        status: milestone.status,
        progress: progress,
      });
    }

    // ─── Build Report Data ──────────────────────────────────────────────────
    const reportingData = {
      projectName: project.projectName || project.name,
      projectNo: project.projectNo,
      status: project.status,
      clientName: project.client?.clientName || null,
      totalValue: project.totalValue || 0,
      currency: project.currency || "EGP",
      summary: {
        totalPlannedExpenses: totalPlannedExpenses,
        totalActualExpenses: totalActualExpenses,
        totalBudgetVariance: totalBudgetVariance,
        totalHoursLogged: totalHoursLogged,
        billableHours: billableHours,
        nonBillableHours: nonBillableHours,
        budgetUtilization: project.totalValue > 0 ? (totalActualExpenses / project.totalValue) * 100 : 0,
      },
      plannedExpenses: {
        total: totalPlannedExpenses,
        byCategory: plannedExpensesByCategory,
      },
      actualExpenses: {
        total: totalActualExpenses,
        byCategory: actualExpensesByCategory,
      },
      budgetVariance: {
        total: totalBudgetVariance,
        byTask: budgetVarianceByTask,
      },
      hours: {
        total: totalHoursLogged,
        billable: billableHours,
        nonBillable: nonBillableHours,
        byUser: Object.values(hoursByUser),
      },
      milestones: milestoneBudgets,
      generatedAt: new Date().toISOString(),
      agencyName: "Agency OS", // Hardcode or get from session
    };

    // Generate PDF
    const generator = new ProjectReportGenerator(reportingData);
    const pdfBytes = generator.getUint8Array();

    // Return PDF - properly convert Uint8Array to Buffer
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=project-report-${project.projectNo || project.id.slice(0, 8)}.pdf`,
      },
    });
  } catch (error: any) {
    console.error("[EXPORT_REPORT_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});