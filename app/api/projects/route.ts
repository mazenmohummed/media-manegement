import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { withAuthGuard } from "@/lib/auth/guard";
import { checkQuotaGuard } from "@/lib/auth/subscriptionGuard";
import { getScopedPrisma, default as prisma } from "@/lib/prisma";

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

interface FinancialBreakdown {
  internalCost: number;
  expensesSum: number;
  marginPercent: number;
  dayRateTotal: number;
  commissionAmount: number;
  overtimeAmount: number;
  bonusAmount: number;
  compensation: number;
  marginAmount: number;
  totalValue: number;
  taskNetProfit: number;
  realCost: number;
}

interface TransactionRecord {
  type: "COMMISSION" | "OVERTIME" | "BONUS" | "DEDUCTION_ABSENT";
  status: "APPROVED";
  amount: number;
  description: string;
  userId: string;
  taskId: string;
}

/**
 * Calculate financial breakdown for a single task
 * UNIFIED calculation for all user types (FREELANCER, FULL_TIME, PART_TIME)
 */
function calculateTaskFinancials(
  task: any,
  assigneeIds: string[],
  preFetchedUsers: any[],
  employeePayUpdates: Array<{ id: string; amount: number }>
): FinancialBreakdown {
  // Core inputs
  const internalCost = parseFloat(task.internalCost ?? task.grossRevenue ?? "0") || 0;
  const marginPercent = parseFloat(task.margin ?? "0") || 0;

  // Expenses sum
  const rentals = task.rentals || task.normalizedRentals || [];
  const expensesSum = rentals.reduce(
    (sum: number, r: any) => sum + (parseFloat((r.cost ?? "0").toString()) || 0),
    0
  );

  // Compensation breakdown
  const compensationStrategy = task.compensationStrategy || "NONE";
  const rawCompensationAmount = parseFloat(
    String(
      task.compensationAmount ??
      task.compensationRate ??
      task.overtimeAmount ??
      task.commissionAmount ??
      "0"
    )
  ) || 0;

  // Day rates (individual per employee)
  const dayRateTotal = round2(
    employeePayUpdates.reduce((sum, emp) => sum + emp.amount, 0)
  );

  // Commission pool (split across all assignees)
  const commissionAmount = compensationStrategy === "COMMISSION" ? rawCompensationAmount : 0;

  // Overtime pool (split across all assignees)
  const overtimeAmount = compensationStrategy === "OVERTIME" ? rawCompensationAmount : 0;

  // Bonus (reserved for future)
  const bonusAmount = 0;

  // Total compensation
  const compensation = round2(dayRateTotal + commissionAmount + overtimeAmount + bonusAmount);

  // === UNIFIED CALCULATIONS FOR ALL USER TYPES ===
  // 1. marginAmount = ((internalCost + expensesSum + compensation) * marginPercent) / 100
  const marginAmount = round2(((internalCost + expensesSum + compensation) * marginPercent) / 100);

  // 2. totalValue = internalCost + expensesSum + marginAmount + compensation
  const totalValue = round2(internalCost + expensesSum + marginAmount + compensation);

  // 3. taskNetProfit = marginAmount (SAME FOR ALL USER TYPES)
  const taskNetProfit = marginAmount;

  // 4. realCost = expensesSum + compensation (SAME FOR ALL USER TYPES)
  const realCost = round2(expensesSum + compensation);

  return {
    internalCost,
    expensesSum,
    marginPercent,
    dayRateTotal,
    commissionAmount: round2(commissionAmount),
    overtimeAmount: round2(overtimeAmount),
    bonusAmount: round2(bonusAmount),
    compensation,
    marginAmount,
    totalValue,
    taskNetProfit,
    realCost,
  };
}

/**
 * Generate all financial transactions for a task
 * Handles: day rates, commission pools, overtime pools, bonuses, deductions
 */
function generateTaskTransactions(
  taskId: string,
  taskType: string,
  assigneeIds: string[],
  employeePayUpdates: Array<{ id: string; amount: number }>,
  commissionAmount: number,
  overtimeAmount: number,
  bonusAmount: number,
  isOutOfWorkingHours: boolean,
  deductionStrategy: string,
  preFetchedUsers: any[]
): TransactionRecord[] {
  const txns: TransactionRecord[] = [];

  // 1. NEGOTIATED DAY RATES (recorded as COMMISSION for each individual)
  for (const emp of employeePayUpdates) {
    txns.push({
      type: "COMMISSION",
      status: "APPROVED",
      amount: round2(emp.amount),
      description: `Negotiated day rate — Task ${taskId} (${taskType})`,
      userId: emp.id,
      taskId,
    });
  }

  // 2. COMMISSION POOL (split equally among all assignees)
  if (commissionAmount > 0 && assigneeIds.length > 0) {
    const perHead = round2(commissionAmount / assigneeIds.length);
    for (const uid of assigneeIds) {
      txns.push({
        type: "COMMISSION",
        status: "APPROVED",
        amount: perHead,
        description: `Commission pool — out-of-hours Task ${taskId} (${taskType})`,
        userId: uid,
        taskId,
      });
    }
  }

  // 3. OVERTIME POOL (split equally among all assignees)
  if (overtimeAmount > 0 && assigneeIds.length > 0) {
    const perHead = round2(overtimeAmount / assigneeIds.length);
    for (const uid of assigneeIds) {
      txns.push({
        type: "OVERTIME",
        status: "APPROVED",
        amount: perHead,
        description: `Overtime pay — out-of-hours Task ${taskId} (${taskType})`,
        userId: uid,
        taskId,
      });
    }
  }

  // 4. BONUS POOL (split equally among all assignees)
  if (bonusAmount > 0 && assigneeIds.length > 0) {
    const perHead = round2(bonusAmount / assigneeIds.length);
    for (const uid of assigneeIds) {
      txns.push({
        type: "BONUS",
        status: "APPROVED",
        amount: perHead,
        description: `Bonus — Task ${taskId} (${taskType})`,
        userId: uid,
        taskId,
      });
    }
  }

  // 5. SALARY DEDUCTIONS (1-day rate for FULL_TIME/PART_TIME only)
  if (isOutOfWorkingHours && deductionStrategy === "DEDUCT_DAY") {
    const staffAssignees = assigneeIds.filter((id: string) => {
      const u = preFetchedUsers.find((pu) => pu.id === id);
      return u?.userType === "FULL_TIME" || u?.userType === "PART_TIME";
    });

    for (const uid of staffAssignees) {
      const user = preFetchedUsers.find((pu) => pu.id === uid);
      const baseSalary = user?.baseSalary ?? 0;
      const dailyRate = baseSalary / 30;
      const deductionAmt = -round2(dailyRate); // Negative = debit

      txns.push({
        type: "DEDUCTION_ABSENT",
        status: "APPROVED",
        amount: deductionAmt,
        description: `1-day salary deduction (out-of-office) — Task ${taskId} (${taskType})`,
        userId: uid,
        taskId,
      });
    }
  }

  return txns;
}

// ─── VALIDATION SCHEMAS ───────────────────────────────────────────────────────

const createProjectSchema = z.object({
  projectName: z.string().min(2, "Project name is required"),
  clientId: z.string().min(1, "Client ID is required"),
  projectStory: z.string().optional(),
  cloudLink: z.string().optional(),
  targetDeadline: z.string().optional(),
  tasks: z.array(z.any()).optional().default([]),
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET = withAuthGuard("project:read", async (req, { agencyId }) => {
  try {
    const scopedDb = getScopedPrisma(agencyId);
    const projects = await scopedDb.project.findMany({
      include: {
        client: { select: { clientName: true } },
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
            taskNetProfit: true,
            totalInvoice: true,
            realCost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("PROJECTS_GET_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST = withAuthGuard("project:create", async (req, { agencyId }) => {
  try {
    // 1. Quota Guard Check
    const quotaCheck = await checkQuotaGuard(agencyId, "projects");
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.error,
          code: "PLAN_LIMIT_REACHED",
          meta: {
            resource: "projects",
            currentPlan: quotaCheck.plan,
            limit: quotaCheck.limit,
            currentCount: quotaCheck.currentCount,
          },
        },
        { status: 403 }
      );
    }

    // 2. Validate Request Input
    const rawBody = await req.json();
    const validation = createProjectSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { projectName, clientId, projectStory, cloudLink, tasks } = validation.data;

    // Pre-fetch assigned users across all payload tasks
    const flatUserIds = tasks.flatMap((t: any) => {
      const employees = t.employeeIds || t.assigneeIds || t.assignees || [];
      return employees.map((a: any) => (typeof a === "string" ? a : a.id));
    });
    const uniqueIds = [...new Set(flatUserIds)].filter(Boolean) as string[];

    const preFetchedUsers = uniqueIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uniqueIds }, agencyId },
          select: { id: true, userType: true, baseSalary: true, walletBalance: true },
        })
      : [];

    // Process tasks, calculations, and financial transactions
    const taskCalculations: any[] = [];
    const allTransactions: TransactionRecord[] = [];

    for (const task of tasks) {
      const generatedTaskId = task.id || crypto.randomUUID();
      const employeeObjs = task.employeeIds || task.assigneeIds || task.assignees || [];
      const assigneeIds: string[] = employeeObjs
        .map((a: any) => (typeof a === "string" ? a : a.id))
        .filter(Boolean);

      const rawAssets = task.assetIds || task.assets || [];
      const assetIds: string[] = rawAssets
        .map((a: any) => (typeof a === "string" ? a : a.id))
        .filter(Boolean);

      const assigneeUsers = assigneeIds
        .map((id) => preFetchedUsers.find((u) => u.id === id))
        .filter(Boolean) as any[];

      const employeePayUpdates: { id: string; amount: number }[] = [];
      employeeObjs.forEach((assigneeObj: any) => {
        const id = typeof assigneeObj === "string" ? assigneeObj : assigneeObj.id;
        const salary = parseFloat((assigneeObj?.salary ?? "0").toString()) || 0;
        if (salary > 0) {
          employeePayUpdates.push({ id, amount: salary });
        }
      });

      const financials = calculateTaskFinancials(
        task,
        assigneeIds,
        preFetchedUsers,
        employeePayUpdates
      );

      const taskTxns = generateTaskTransactions(
        generatedTaskId,
        task.taskType || "GENERAL",
        assigneeIds,
        employeePayUpdates,
        financials.commissionAmount,
        financials.overtimeAmount,
        financials.bonusAmount,
        task.isOutOfWorkingHours || false,
        task.deductionStrategy || "NONE",
        preFetchedUsers
      );

      allTransactions.push(...taskTxns);

      taskCalculations.push({
        ...task,
        id: generatedTaskId,
        assigneeIds,
        assetIds,
        assigneeUsers,
        ...financials,
        normalizedRentals: task.rentals || task.normalizedRentals || [],
        normalizedTodos: task.todos || [],
      });
    }

    const projectTotalInvoice = taskCalculations.reduce(
      (acc: number, t: any) => acc + t.totalValue,
      0
    );

    const targetDeadline = validation.data.targetDeadline
      ? new Date(validation.data.targetDeadline)
      : tasks.length > 0
      ? new Date(
          Math.max(
            ...tasks.map((t: any) => new Date(t.endDate || t.targetDeadline || Date.now()).getTime())
          )
        )
      : new Date();

    // Perform database transaction
    const result = await prisma.$transaction(
      async (tx) => {
        const projectCount = await tx.project.count({ where: { agencyId } });
        const projectNo = `PRJ-${(projectCount + 1).toString().padStart(3, "0")}`;

        const project = await tx.project.create({
          data: {
            projectNo,
            projectName,
            name: projectName, 
            projectStory,
            cloudLink,
            status: "ACTIVE",
            totalValue: round2(projectTotalInvoice),
            targetDeadline,
            agency: { connect: { id: agencyId } },
            client: { connect: { id: clientId } },
            tasks: {
              create: taskCalculations.map((t: any, index: number) => ({
                id: t.id,
                taskNo: `${projectNo}-T${(index + 1).toString().padStart(2, "0")}`,
                taskType: t.taskType || "GENERAL",
                status: t.status || "PENDING",
                internalCost: t.internalCost,
                margin: t.marginPercent,
                marginAmount: t.marginAmount,
                totalInvoice: t.totalValue,
                taskNetProfit: t.taskNetProfit,
                realCost: t.realCost,
                startDate: t.startDate ? new Date(t.startDate) : new Date(),
                endDate: t.endDate ? new Date(t.endDate) : new Date(),
                description: t.description || "",
                latitude: t.latitude ?? null,
                longitude: t.longitude ?? null,
                locationName: t.locationName || null,
                isOutOfWorkingHours: t.isOutOfWorkingHours ?? false,
                compensationStrategy: t.compensationStrategy ?? "NONE",
                deductionStrategy: t.deductionStrategy ?? "NONE",
                agency: { connect: { id: agencyId } },
                assignees:
                  t.assigneeIds?.length > 0
                    ? { connect: t.assigneeIds.map((id: string) => ({ id })) }
                    : undefined,
                assets:
                  t.assetIds?.length > 0
                    ? { connect: t.assetIds.map((id: string) => ({ id })) }
                    : undefined,
                todos:
                  t.normalizedTodos?.length > 0
                    ? {
                        create: t.normalizedTodos.map((td: any) => ({
                          id: td.id || undefined,
                          text: td.text,
                          description: td.description || undefined,
                          completed: typeof td.completed === "boolean" ? td.completed : false,
                          priority: td.priority || "MEDIUM",
                          order: typeof td.order === "number" ? td.order : 0,
                          agency: { connect: { id: agencyId } },
                        })),
                      }
                    : undefined,
              })),
            },
          },
        });

        // Insert task expenses
        const expensesPayload = taskCalculations.flatMap((t: any) => {
          if (!t.normalizedRentals?.length) return [];
          return t.normalizedRentals.map((r: any) => ({
            itemName: r.name || r.itemName || "Unnamed",
            cost: parseFloat((r.cost ?? "0").toString()) || 0,
            category: r.category || "EQUIPMENT",
            description: r.description || undefined,
            taskId: t.id,
            projectId: project.id,
            agencyId,
          }));
        });

        if (expensesPayload.length > 0) {
          await tx.taskExpense.createMany({ data: expensesPayload });
        }

        // Apply wallet increments for internal assignees
        const walletUpdates = new Map<string, number>();
        for (const txn of allTransactions) {
          const current = walletUpdates.get(txn.userId) || 0;
          walletUpdates.set(txn.userId, current + txn.amount);
        }

        for (const [userId, amount] of walletUpdates.entries()) {
          await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { increment: amount } },
          });
        }

        // Store ledger transaction history
        if (allTransactions.length > 0) {
          await tx.financialTransaction.createMany({
            data: allTransactions.map((t) => ({
              type: t.type,
              status: t.status,
              amount: t.amount,
              description: t.description,
              userId: t.userId,
              taskId: t.taskId,
            })),
          });
        }

        return await tx.project.findUnique({
          where: { id: project.id },
          include: {
            tasks: {
              include: {
                taskExpenses: true,
                assignees: true,
                assets: true,
                todos: true,
                financialTransactions: true,
              },
            },
          },
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST_ERROR:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
});