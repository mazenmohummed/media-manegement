import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import crypto from "crypto";

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * FINANCIAL CALCULATION REFERENCE:
 * 
 * === INPUTS ===
 * internalCost:  Gross Revenue from UI ($)
 * marginPercent: Target Margin from UI (%)
 * expensesSum:   Sum of all rentals/expenses ($)
 * compensation:  Total of (Day Rate + Commission Amount + Overtime Flat Rate + Bonus) ($)
 * 
 * === COMPENSATION BREAKDOWN ===
 * Day Rate ($)               → Recorded as COMMISSION (individual per employee)
 * Commission Amount ($)      → Recorded as COMMISSION (split across assignees)
 * Overtime Flat Rate ($)     → Recorded as OVERTIME (split across assignees)
 * Bonus ($)                  → Recorded as BONUS (split across assignees)
 * Total compensation = Day Rate + Commission + Overtime + Bonus
 * 
 * === CALCULATIONS (UNIFIED FOR ALL USER TYPES) ===
 * 1. marginAmount = ((internalCost + expensesSum + compensation) * marginPercent) / 100
 * 2. totalValue = internalCost + expensesSum + marginAmount + compensation
 * 3. taskNetProfit = marginAmount (SAME FOR ALL: FREELANCER, FULL_TIME, PART_TIME)
 * 4. realCost = expensesSum + compensation (SAME FOR ALL)
 * 
 * === TRANSACTIONS RECORDED ===
 * 1. Negotiated Day Rate (individual) → COMMISSION (all user types)
 * 2. Commission Pool (split across assignees) → COMMISSION
 * 3. Overtime Pool (split across assignees) → OVERTIME
 * 4. Bonus Pool (split across assignees) → BONUS
 * 5. Salary Deduction (FULL_TIME/PART_TIME only) → DEDUCTION_ABSENT
 */

interface FinancialBreakdown {
  internalCost: number;
  expensesSum: number;
  marginPercent: number;
  dayRateTotal: number;        // Sum of all individual day rates
  commissionAmount: number;     // Commission pool to split
  overtimeAmount: number;       // Overtime pool to split
  bonusAmount: number;          // Bonus pool to split
  compensation: number;         // Total of all compensation
  marginAmount: number;
  totalValue: number;
  taskNetProfit: number;        // Same for all user types
  realCost: number;             // Same for all user types
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

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;
    if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { agencyId },
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
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;
    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { projectName, clientId, projectStory, cloudLink, tasks = [] } = body;

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    if (!projectName) return NextResponse.json({ error: "projectName is required" }, { status: 400 });

    // Pre-fetch all users
    const flatUserIds = tasks.flatMap((t: any) => {
      const employees = t.employeeIds || t.assigneeIds || t.assignees || [];
      return employees.map((a: any) => (typeof a === "string" ? a : a.id));
    });
    const uniqueIds = [...new Set(flatUserIds)].filter(Boolean) as string[];

    const preFetchedUsers = uniqueIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, userType: true, baseSalary: true, walletBalance: true },
        })
      : [];

    // Process each task: calculate financials + prepare transaction records
    const taskCalculations: any[] = [];
    const allTransactions: TransactionRecord[] = [];

    for (const task of tasks) {
      const generatedTaskId = task.id || crypto.randomUUID();
      const employeeObjs = task.employeeIds || task.assigneeIds || task.assignees || [];
      const assigneeIds: string[] = employeeObjs
        .map((a: any) => (typeof a === "string" ? a : a.id))
        .filter(Boolean);

      const assigneeUsers = assigneeIds
        .map((id) => preFetchedUsers.find((u) => u.id === id))
        .filter(Boolean) as any[];

      // Extract negotiated day rates (individual per employee)
      const employeePayUpdates: { id: string; amount: number }[] = [];
      employeeObjs.forEach((assigneeObj: any) => {
        const id = typeof assigneeObj === "string" ? assigneeObj : assigneeObj.id;
        const salary = parseFloat((assigneeObj?.salary ?? "0").toString()) || 0;
        if (salary > 0) {
          employeePayUpdates.push({ id, amount: salary });
        }
      });

      // Calculate financials (UNIFIED for all user types)
      const financials = calculateTaskFinancials(
        task,
        assigneeIds,
        preFetchedUsers,
        employeePayUpdates
      );

      // Generate transactions
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
        assigneeUsers,
        ...financials,
        normalizedRentals: task.rentals || task.normalizedRentals || [],
        normalizedTodos: task.todos || [],
      });

      console.log("[TASK_CREATED]", {
        taskNo: `${task.taskType}-${generatedTaskId.substring(0, 8)}`,
        internalCost: financials.internalCost,
        expensesSum: financials.expensesSum,
        compensation: financials.compensation,
        marginPercent: financials.marginPercent,
        marginAmount: financials.marginAmount,
        totalValue: financials.totalValue,
        taskNetProfit: financials.taskNetProfit,
        realCost: financials.realCost,
      });
    }

    // Project totals
    const projectTotalInvoice = taskCalculations.reduce(
      (acc: number, t: any) => acc + t.totalValue,
      0
    );

    const targetDeadline =
      tasks.length > 0
        ? new Date(
            Math.max(
              ...tasks.map((t: any) => new Date(t.endDate || t.targetDeadline || Date.now()).getTime())
            )
          )
        : new Date();

    // Execute transaction
    const result = await prisma.$transaction(
      async (tx) => {
        const projectCount = await tx.project.count({ where: { agencyId } });
        const projectNo = `PRJ-${(projectCount + 1).toString().padStart(3, "0")}`;

        // Create project with tasks
        const project = await tx.project.create({
          data: {
            projectNo,
            projectName,
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
                isOutOfWorkingHours: t.isOutOfWorkingHours,
                compensationStrategy: t.compensationStrategy,
                deductionStrategy: t.deductionStrategy,
                agency: { connect: { id: agencyId } },
                assignees:
                  t.assigneeIds?.length > 0
                    ? { connect: t.assigneeIds.map((id: string) => ({ id })) }
                    : undefined,
                assets:
                  t.assetIds?.length > 0 ? { connect: t.assetIds.map((id: string) => ({ id })) } : undefined,
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

        // Create task expenses
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

        // Update wallets for all transactions
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

        // Bulk create transactions
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
}
