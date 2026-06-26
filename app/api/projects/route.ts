import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import crypto from "crypto";

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

    if (!clientId)     return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    if (!projectName)  return NextResponse.json({ error: "projectName is required" }, { status: 400 });

    // ── Pre-fetch all assignees across all tasks ──────────────────────────────
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

    // ── Compute financials for each task ─────────────────────────────────────
    const taskDataWithCalculations = tasks.map((task: any) => {
      const generatedTaskId = task.id || crypto.randomUUID();

      const employeeObjs = task.employeeIds || task.assigneeIds || task.assignees || [];
      const assigneeIds: string[] = employeeObjs
        .map((a: any) => (typeof a === "string" ? a : a.id))
        .filter(Boolean);

      // Determine assignee types
      const assigneeUsers = assigneeIds.map((id) => preFetchedUsers.find((u) => u.id === id)).filter(Boolean) as any[];
      const hasStaff = assigneeUsers.some((u) => u.userType === "FULL_TIME" || u.userType === "PART_TIME");
      const hasOnlyFreelancers = assigneeIds.length > 0 && !hasStaff;

      // ── Core inputs from TaskConfigCard ─────────────────────────────────
      // grossRevenue in UI → internalCost in DB
      // margin in UI       → margin in DB (percentage)
      const internalCost = parseFloat(task.internalCost ?? task.grossRevenue ?? "0") || 0;
      const marginPercent = parseFloat(task.margin ?? "0") || 0;

      // Sum of all task expenses (rentals)
      const rentals = task.rentals || task.normalizedRentals || [];
      const expensesSum = rentals.reduce(
        (sum: number, r: any) => sum + (parseFloat((r.cost ?? "0").toString()) || 0),
        0
      );

      // ── Compensation amounts ──────────────────────────────────────────────
      const compensationStrategy: string = task.compensationStrategy || "NONE";
      const deductionStrategy: string    = task.deductionStrategy    || "NONE";
      const isOutOfWorkingHours: boolean = !!task.isOutOfWorkingHours;

      // Parse compensation unconditionally — the strategy + amount drive realCost
      // and totalValue regardless of isOutOfWorkingHours. That flag only gates
      // deductions and ledger transaction recording, not the pay amounts.
      // Debug: log exact task keys received so we can confirm the field name
      console.log("[TASK_FINANCIALS]", {
        taskType: task.taskType,
        compensationStrategy: task.compensationStrategy,
        compensationAmount: task.compensationAmount,
        internalCost: task.internalCost,
        grossRevenue: task.grossRevenue,
        isOutOfWorkingHours: task.isOutOfWorkingHours,
      });

      // Support every possible field name the front-end might send this under
      const rawCompensationAmount = parseFloat(
        String(
          task.compensationAmount ??
          task.compensationRate   ??
          task.overtimeAmount     ??
          task.commissionAmount   ??
          "0"
        )
      ) || 0;

      // Hard guard: if a strategy is set but amount is still 0, warn loudly
      if (compensationStrategy !== "NONE" && rawCompensationAmount === 0) {
        console.warn(
          `[TASK_FINANCIALS] WARNING: compensationStrategy="${compensationStrategy}" but compensationAmount resolved to 0. ` +
          `Raw value from payload: task.compensationAmount=${JSON.stringify(task.compensationAmount)}. ` +
          `Full task keys: ${Object.keys(task).join(", ")}`
        );
      }

      const commissionAmount = compensationStrategy === "COMMISSION" ? rawCompensationAmount : 0;
      const overtimeAmount   = compensationStrategy === "OVERTIME"   ? rawCompensationAmount : 0;

      // bonus is not yet wired in the UI but reserved for future use
      const bonusAmount = 0;

      const totalCompensation = commissionAmount + overtimeAmount + bonusAmount;

      // ── Margin calculation ────────────────────────────────────────────────
      // marginAmount = ((internalCost + expensesSum) * margin) / 100
      const marginAmount = ((internalCost + expensesSum) * marginPercent) / 100;

      // ── Total invoice value ───────────────────────────────────────────────
      // totalValue = internalCost + expensesSum + marginAmount + COMMISSION + OVERTIME + BONUS
      const totalValue = internalCost + expensesSum + marginAmount + totalCompensation;

      // ── Net profit & real cost (type-dependent) ───────────────────────────
      let taskNetProfit: number;
      let realCost: number;

      if (hasOnlyFreelancers) {
        // FREELANCER rules
        taskNetProfit = marginAmount;
        realCost      = expensesSum + internalCost;
      } else {
        // FULL_TIME / PART_TIME rules
        taskNetProfit = totalValue - expensesSum;
        realCost      = expensesSum + totalCompensation;
      }

      // ── Freelancer negotiated pay ─────────────────────────────────────────
      const freelancerUpdates: { id: string; amount: number }[] = [];
      employeeObjs.forEach((assigneeObj: any) => {
        const id     = typeof assigneeObj === "string" ? assigneeObj : assigneeObj.id;
        const salary = parseFloat((assigneeObj?.salary ?? "0").toString()) || 0;
        const user   = preFetchedUsers.find((u) => u.id === id);
        if (user?.userType === "FREELANCER" && salary > 0) {
          freelancerUpdates.push({ id, amount: salary });
        }
      });

      // ── Sanity check log ─────────────────────────────────────────────────────
      console.log("[TASK_COMPUTED]", {
        taskType: task.taskType,
        internalCost,
        expensesSum,
        marginPercent,
        marginAmount: round2(marginAmount),
        rawCompensationAmount,
        compensationStrategy,
        commissionAmount,
        overtimeAmount,
        totalCompensation,
        totalValue: round2(totalValue),
        taskNetProfit: round2(taskNetProfit),
        realCost: round2(realCost),
        hasStaff,
        hasOnlyFreelancers,
      });

      return {
        ...task,
        id: generatedTaskId,
        assigneeIds,
        assigneeUsers,
        hasStaff,
        hasOnlyFreelancers,
        internalCost,
        marginPercent,
        expensesSum,
        marginAmount,
        totalValue,
        taskNetProfit:        round2(taskNetProfit),
        realCost:             round2(realCost),
        commissionAmount:     round2(commissionAmount),
        overtimeAmount:       round2(overtimeAmount),
        bonusAmount:          round2(bonusAmount),
        totalCompensation:    round2(totalCompensation),
        isOutOfWorkingHours,
        compensationStrategy,
        deductionStrategy,
        freelancerUpdates,
        normalizedRentals:    rentals,
        normalizedTodos:      task.todos || [],
      };
    });

    // ── Project-level totals ──────────────────────────────────────────────────
    const projectTotalInvoice = taskDataWithCalculations.reduce(
      (acc: number, t: any) => acc + t.totalValue, 0
    );

    const targetDeadline = tasks.length > 0
      ? new Date(Math.max(...tasks.map((t: any) =>
          new Date(t.endDate || t.targetDeadline || Date.now()).getTime()
        )))
      : new Date();

    // ── Transaction ───────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const projectCount = await tx.project.count({ where: { agencyId } });
      const projectNo    = `PRJ-${(projectCount + 1).toString().padStart(3, "0")}`;

      // Collect all FinancialTransaction rows to bulk-insert at the end
      const financialTxns: Array<{
        type: "COMMISSION" | "OVERTIME" | "BONUS" | "DEDUCTION_ABSENT" | "DEDUCTION_LATE";
        status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
        amount: number;
        description: string;
        userId: string;
        taskId: string;
      }> = [];

      // ── 1. Create project + tasks ─────────────────────────────────────────
      const project = await tx.project.create({
        data: {
          projectNo,
          projectName,
          projectStory,
          cloudLink,
          status:          "ACTIVE",
          totalValue:      round2(projectTotalInvoice),
          targetDeadline,
          agency:  { connect: { id: agencyId } },
          client:  { connect: { id: clientId } },
          tasks: {
            create: taskDataWithCalculations.map((t: any, index: number) => ({
              id:            t.id,
              taskNo:        `${projectNo}-T${(index + 1).toString().padStart(2, "0")}`,
              taskType:      t.taskType || "GENERAL",
              status:        t.status   || "PENDING",
              internalCost:  t.internalCost,
              margin:        t.marginPercent,
              marginAmount:  round2(t.marginAmount),
              totalInvoice:  round2(t.totalValue),
              taskNetProfit: t.taskNetProfit,
              realCost:      t.realCost,
              startDate:     t.startDate ? new Date(t.startDate) : new Date(),
              endDate:       t.endDate   ? new Date(t.endDate)   : new Date(),
              description:   t.description || "",
              latitude:      t.latitude    ?? null,
              longitude:     t.longitude   ?? null,
              locationName:  t.locationName || null,
              isOutOfWorkingHours:  t.isOutOfWorkingHours,
              compensationStrategy: t.compensationStrategy,
              deductionStrategy:    t.deductionStrategy,
              agency:    { connect: { id: agencyId } },
              assignees: t.assigneeIds?.length > 0
                ? { connect: t.assigneeIds.map((id: string) => ({ id })) }
                : undefined,
              assets: t.assetIds?.length > 0
                ? { connect: t.assetIds.map((id: string) => ({ id })) }
                : undefined,
              todos: t.normalizedTodos?.length > 0
                ? {
                    create: t.normalizedTodos.map((td: any) => ({
                      id:          td.id || undefined,
                      text:        td.text,
                      description: td.description || undefined,
                      completed:   typeof td.completed === "boolean" ? td.completed : false,
                      priority:    td.priority || "MEDIUM",
                      order:       typeof td.order === "number" ? td.order : 0,
                      agency:      { connect: { id: agencyId } },
                    })),
                  }
                : undefined,
            })),
          },
        },
      });

      // ── 2. Create TaskExpenses ────────────────────────────────────────────
      const expensesPayload = taskDataWithCalculations.flatMap((t: any) => {
        if (!t.normalizedRentals?.length) return [];
        return t.normalizedRentals.map((r: any) => ({
          itemName:    r.name || r.itemName || "Unnamed",
          cost:        parseFloat((r.cost ?? "0").toString()) || 0,
          category:    r.category || "EQUIPMENT",
          description: r.description || undefined,
          taskId:      t.id,
          projectId:   project.id,
          agencyId,
        }));
      });

      if (expensesPayload.length > 0) {
        await tx.taskExpense.createMany({ data: expensesPayload });
      }

      // ── 3. Per-task financial transaction recording ───────────────────────
      for (const t of taskDataWithCalculations) {

        // 3a. Freelancer negotiated pay → wallet increment + COMMISSION txn
        for (const fu of t.freelancerUpdates) {
          await tx.user.update({
            where: { id: fu.id },
            data:  { walletBalance: { increment: fu.amount } },
          });
          financialTxns.push({
            type:        "COMMISSION",
            status:      "APPROVED",
            amount:      round2(fu.amount),
            description: `Freelancer negotiated pay — Task ${t.id} (${t.taskType || "GENERAL"})`,
            userId:      fu.id,
            taskId:      t.id,
          });
        }

        // 3b. Commission pool (out-of-hours, split across all assignees)
        if (t.commissionAmount > 0 && t.assigneeIds.length > 0) {
          const perHead = round2(t.commissionAmount / t.assigneeIds.length);
          for (const uid of t.assigneeIds) {
            await tx.user.update({
              where: { id: uid },
              data:  { walletBalance: { increment: perHead } },
            });
            financialTxns.push({
              type:        "COMMISSION",
              status:      "APPROVED",
              amount:      perHead,
              description: `Commission pool — out-of-hours Task ${t.id} (${t.taskType || "GENERAL"})`,
              userId:      uid,
              taskId:      t.id,
            });
          }
        }

        // 3c. Overtime pool (out-of-hours, split across all assignees)
        if (t.overtimeAmount > 0 && t.assigneeIds.length > 0) {
          const perHead = round2(t.overtimeAmount / t.assigneeIds.length);
          for (const uid of t.assigneeIds) {
            await tx.user.update({
              where: { id: uid },
              data:  { walletBalance: { increment: perHead } },
            });
            financialTxns.push({
              type:        "OVERTIME",
              status:      "APPROVED",
              amount:      perHead,
              description: `Overtime pay — out-of-hours Task ${t.id} (${t.taskType || "GENERAL"})`,
              userId:      uid,
              taskId:      t.id,
            });
          }
        }

        // 3d. Bonus (reserved; amount is 0 for now but txn recorded when > 0)
        if (t.bonusAmount > 0 && t.assigneeIds.length > 0) {
          const perHead = round2(t.bonusAmount / t.assigneeIds.length);
          for (const uid of t.assigneeIds) {
            await tx.user.update({
              where: { id: uid },
              data:  { walletBalance: { increment: perHead } },
            });
            financialTxns.push({
              type:        "BONUS",
              status:      "APPROVED",
              amount:      perHead,
              description: `Bonus — Task ${t.id} (${t.taskType || "GENERAL"})`,
              userId:      uid,
              taskId:      t.id,
            });
          }
        }

        // 3e. Deduction: 1 day from baseSalary for FULL_TIME / PART_TIME who skip the office
        if (t.isOutOfWorkingHours && t.deductionStrategy === "DEDUCT_DAY") {
          const staffAssignees = t.assigneeIds.filter((id: string) => {
            const u = preFetchedUsers.find((pu) => pu.id === id);
            return u?.userType === "FULL_TIME" || u?.userType === "PART_TIME";
          });

          for (const uid of staffAssignees) {
            const user          = preFetchedUsers.find((pu) => pu.id === uid);
            const baseSalary    = user?.baseSalary ?? 0;
            const dailyRate     = baseSalary / 30;                           // 30-day month assumption
            const deductionAmt  = -round2(dailyRate);                        // negative = debit

            await tx.user.update({
              where: { id: uid },
              data:  { walletBalance: { increment: deductionAmt } },         // increment with a negative
            });
            financialTxns.push({
              type:        "DEDUCTION_ABSENT",
              status:      "APPROVED",
              amount:      deductionAmt,                                      // stored as negative
              description: `1-day salary deduction (out-of-office) — Task ${t.id} (${t.taskType || "GENERAL"})`,
              userId:      uid,
              taskId:      t.id,
            });
          }
        }
      }

      // ── 4. Bulk-insert all FinancialTransaction rows ──────────────────────
      if (financialTxns.length > 0) {
        await tx.financialTransaction.createMany({
          data: financialTxns.map((f) => ({
            type:        f.type,
            status:      f.status,
            amount:      f.amount,
            description: f.description,
            userId:      f.userId,
            taskId:      f.taskId,
          })),
        });
      }

      // ── 5. Return full project with relations ─────────────────────────────
      return await tx.project.findUnique({
        where: { id: project.id },
        include: {
          tasks: {
            include: {
              taskExpenses:          true,
              assignees:             true,
              todos:                 true,
              financialTransactions: true,
            },
          },
        },
      });
    }, {
      maxWait: 10000,
      timeout:  30000,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST_ERROR:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}