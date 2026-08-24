import { db } from "@/lib/db";

export async function recalculateTaskExpenseTotals(taskId: string) {
  // Fetch all planned expenses for the task
  const expenses = await db.taskPlannedExpense.findMany({
    where: { taskId },
  });

  let plannedExpenseTotal = 0;
  let approvedBudget = 0;

  for (const exp of expenses) {
    plannedExpenseTotal += exp.totalEstimated;
    if (exp.status === "APPROVED") {
      // Use approvedCost if defined, otherwise fall back to totalEstimated
      approvedBudget += exp.approvedCost ?? exp.totalEstimated;
    }
  }

  // Fetch task to get plannedRevenue
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { plannedRevenue: true },
  });

  const plannedRevenue = task?.plannedRevenue ?? 0;
  // Variance calculation: Revenue minus Approved Budget
  const budgetVariance = plannedRevenue - approvedBudget;

  // Update the task record with the calculated values
  await db.task.update({
    where: { id: taskId },
    data: {
      plannedExpenseTotal,
      approvedBudget,
      budgetVariance,
    },
  });
}