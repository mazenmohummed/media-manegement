// app/api/projects/[projectId]/reporting/route.ts
import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET: Fetch project reporting data (planned vs actual expenses, budget variance, hours logged)
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
          where: { status: { not: "CANCELLED" } },
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
        where: { status: { not: "CANCELLED" } },
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
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
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
    const plannedExpensesByTask: Array<{
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
    }> = [];

    // 2. Actual Expenses
    let totalActualExpenses = 0;
    const actualExpensesByCategory: Record<string, number> = {};
    const actualExpensesByTask: Array<{
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
    }> = [];

    // 3. Hours Logged
    let totalHoursLogged = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const hoursByUser: Record<string, { name: string; hours: number; billable: number; nonBillable: number }> = {};
    const hoursByTask: Record<string, { taskId: string; taskTitle: string | null; hours: number; billable: number; nonBillable: number }> = {};

    // 4. Budget Variance
    let totalBudgetVariance = 0;
    const budgetVarianceByTask: Record<string, { taskId: string; taskTitle: string | null; budget: number; actual: number; variance: number }> = {};

    // 5. Milestone Budget Tracking
    const milestoneBudgets: Array<{
      id: string;
      name: string;
      budget: number;
      actualExpenses: number;
      variance: number;
      status: string;
      deadline: string | null;
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

      if (taskPlanned.length > 0) {
        plannedExpensesByTask.push({
          taskId: task.id,
          taskTitle: task.title,
          totalEstimated: taskPlannedTotal,
          status: task.status,
          items: taskPlanned.map((exp: any) => ({
            id: exp.id,
            itemName: exp.itemName,
            category: exp.category || "OTHER",
            estimatedCost: exp.estimatedCost || 0,
            approvedCost: exp.approvedCost || null,
            status: exp.status,
            quantity: exp.quantity || 1,
            unitCost: exp.unitCost || 0,
            taxRate: exp.taxRate || 0,
            totalEstimated: exp.totalEstimated || exp.estimatedCost || 0,
          })),
        });
      }

      // ── Actual Expenses ──
      const taskActual = task.taskExpenses || [];
      const taskActualTotal = taskActual.reduce((sum: number, exp: any) => sum + (exp.cost || 0), 0);
      totalActualExpenses += taskActualTotal;

      // Group actual expenses by category
      taskActual.forEach((exp: any) => {
        const category = exp.category || "OTHER";
        actualExpensesByCategory[category] = (actualExpensesByCategory[category] || 0) + (exp.cost || 0);
      });

      if (taskActual.length > 0) {
        actualExpensesByTask.push({
          taskId: task.id,
          taskTitle: task.title,
          totalCost: taskActualTotal,
          status: task.status,
          items: taskActual.map((exp: any) => ({
            id: exp.id,
            itemName: exp.itemName,
            category: exp.category || "OTHER",
            cost: exp.cost || 0,
            status: exp.status,
            reimbursable: exp.reimbursable || false,
            incurredAt: exp.incurredAt ? exp.incurredAt.toISOString() : null,
            receiptUrl: exp.receiptUrl || null,
          })),
        });
      }

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

      // Group hours by task
      if (taskSessions.length > 0) {
        hoursByTask[task.id] = {
          taskId: task.id,
          taskTitle: task.title,
          hours: taskBillableHours + taskNonBillableHours,
          billable: taskBillableHours,
          nonBillable: taskNonBillableHours,
        };
      }

      // Group hours by assignee/user
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach((assignee: any) => {
          const hoursPerUser = taskSessions.length > 0 && task.assignees.length > 0
            ? (taskBillableHours + taskNonBillableHours) / task.assignees.length
            : 0;

          if (!hoursByUser[assignee.id]) {
            hoursByUser[assignee.id] = {
              name: assignee.name,
              hours: 0,
              billable: 0,
              nonBillable: 0,
            };
          }
          hoursByUser[assignee.id].hours += hoursPerUser;
          hoursByUser[assignee.id].billable += (hoursPerUser * (taskBillableHours / (taskBillableHours + taskNonBillableHours || 1)));
          hoursByUser[assignee.id].nonBillable += (hoursPerUser * (taskNonBillableHours / (taskBillableHours + taskNonBillableHours || 1)));
        });
      }

      // ── Budget Variance ──
      const taskBudget = task.approvedBudget || 0;
      const taskActualCost = taskActualTotal;
      const taskVariance = taskBudget - taskActualCost;

      totalBudgetVariance += taskVariance;

      budgetVarianceByTask[task.id] = {
        taskId: task.id,
        taskTitle: task.title,
        budget: taskBudget,
        actual: taskActualCost,
        variance: taskVariance,
      };
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
        id: milestone.id,
        name: milestone.name,
        budget: milestoneBudget,
        actualExpenses: milestoneActualExpenses,
        variance: variance,
        status: milestone.status,
        deadline: milestone.deadline ? milestone.deadline.toISOString() : null,
        progress: progress,
      });
    }

    // ─── Build Response ──────────────────────────────────────────────────
    const reportingData = {
      project: {
        id: project.id,
        name: project.name,
        projectName: project.projectName,
        projectNo: project.projectNo,
        status: project.status,
        totalValue: project.totalValue,
        currency: project.currency,
        client: project.client,
        tags: project.tags,
        _count: project._count,
      },
      summary: {
        totalPlannedExpenses: totalPlannedExpenses,
        totalActualExpenses: totalActualExpenses,
        totalBudgetVariance: totalBudgetVariance,
        totalHoursLogged: totalHoursLogged,
        billableHours: billableHours,
        nonBillableHours: nonBillableHours,
        averageBillableRate: totalHoursLogged > 0 ? (billableHours / totalHoursLogged) * 100 : 0,
        expenseVariancePercentage: totalPlannedExpenses > 0
          ? ((totalActualExpenses - totalPlannedExpenses) / totalPlannedExpenses) * 100
          : 0,
        totalBudget: project.totalValue ?? 0,
        budgetUtilization: (project.totalValue ?? 0) > 0
          ? (totalActualExpenses / project.totalValue) * 100
          : 0,
      },
      plannedExpenses: {
        total: totalPlannedExpenses,
        byCategory: plannedExpensesByCategory,
        byTask: plannedExpensesByTask,
      },
      actualExpenses: {
        total: totalActualExpenses,
        byCategory: actualExpensesByCategory,
        byTask: actualExpensesByTask,
      },
      hours: {
        total: totalHoursLogged,
        billable: billableHours,
        nonBillable: nonBillableHours,
        byTask: Object.values(hoursByTask),
        byUser: Object.values(hoursByUser),
      },
      budgetVariance: {
        total: totalBudgetVariance,
        byTask: Object.values(budgetVarianceByTask),
      },
      milestones: milestoneBudgets,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: reportingData,
    });
  } catch (error: any) {
    console.error("[PROJECT_REPORTING_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});