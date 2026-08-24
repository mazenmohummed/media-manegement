import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

export const POST = withAuthGuard("task:update", async (req: NextRequest, { agencyId }) => {
  const db = getScopedPrisma(agencyId);
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const taskId = segments[2];
  const expenseId = segments[4];

  // 1. Find the planned expense
  const planned = await db.taskPlannedExpense.findFirst({
    where: { id: expenseId, taskId, agencyId },
  });

  if (!planned) {
    return NextResponse.json({ error: "Planned expense not found" }, { status: 404 });
  }

  // 2. Create the actual TaskExpense record from it
  const taskExpense = await db.taskExpense.create({
    data: {
      itemName: planned.itemName,
      cost: planned.totalEstimated, // or unitCost, depending on your business logic
      category: planned.category,
      description: planned.description,
      agencyId: planned.agencyId,
      projectId: planned.projectId,
      taskId: planned.taskId,
      plannedExpenseId: planned.id,
      vendorId: planned.vendorId,
      status: "PENDING",
    },
  });

  // 3. Optionally update planned expense status to indicate it has been converted/approved
  await db.taskPlannedExpense.update({
    where: { id: expenseId },
    data: { status: "APPROVED" },
  });

  return NextResponse.json({ success: true, taskExpense });
});