import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized: No Agency linked to user session" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: {
        id: id,
        agencyId: agencyId,
      },
      include: {
        agency: true,
        client: true,
        tasks: {
          include: {
            assignees: {
              select: {
                id: true,
                name: true,
                userType: true,
                baseSalary: true,
                walletBalance: true,
              },
            },
            taskExpenses: true,
            todos: true,
            assets: true,
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

    // Calculate project totals from task financial fields (already computed in DB)
    const projectTotals = project.tasks.reduce(
      (acc, t) => ({
        totalProjectInvoice: acc.totalProjectInvoice + (t.totalInvoice || 0),
        totalProjectProfit: acc.totalProjectProfit + (t.taskNetProfit || 0),
        totalProjectCost: acc.totalProjectCost + (t.realCost || 0),
      }),
      { totalProjectInvoice: 0, totalProjectProfit: 0, totalProjectCost: 0 }
    );

    return NextResponse.json({
      ...project,
      ...projectTotals,
    });
  } catch (error: any) {
    console.error("ROUTE_ERROR_PROJECT_BY_ID_GET:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = (session as any)?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized: No Agency linked to user session" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Security check: ensure project exists and belongs to agency
    const existingProject = await prisma.project.findUnique({
      where: { id: id },
      select: { agencyId: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (existingProject.agencyId !== agencyId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this project" },
        { status: 403 }
      );
    }

    // Cascade cleanup + wallet reversal in transaction
    await prisma.$transaction(async (tx) => {
      // Fetch all tasks with their assignees and financial transactions
      const tasks = await tx.task.findMany({
        where: { projectId: id },
        include: {
          assignees: {
            select: { id: true, userType: true, walletBalance: true },
          },
        },
      });

      const taskIds = tasks.map((t) => t.id);

      // ── Step 1: Reverse wallet balances for all users (FREELANCER, FULL_TIME, PART_TIME)
      for (const task of tasks) {
        for (const user of task.assignees) {
          const currentBalance = user.walletBalance || 0;

          // Fetch all financial transactions for this user+task
          const txns = await tx.financialTransaction.findMany({
            where: {
              userId: user.id,
              taskId: task.id,
            },
            select: { amount: true },
          });

          // Sum all transaction amounts to reverse
          const totalToReverse = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
          const newBalance = Math.max(0, currentBalance - totalToReverse);

          console.log(
            `[DELETE_PROJECT] Reversing wallet for user ${user.id}: ${currentBalance} - ${totalToReverse} = ${newBalance}`
          );

          await tx.user.update({
            where: { id: user.id },
            data: { walletBalance: newBalance },
          });
        }
      }

      // ── Step 2: Delete all related task records
      if (taskIds.length > 0) {
        // Delete comments linked to tasks
        await tx.comment.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete attendance logs linked to tasks
        await tx.attendanceLog.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete task expenses
        await tx.taskExpense.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete todos (should cascade, but explicit is safer)
        await tx.todo.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete financial transactions
        await tx.financialTransaction.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete tasks themselves
        await tx.task.deleteMany({
          where: { projectId: id },
        });
      }

      // ── Step 3: Delete project
      await tx.project.delete({
        where: { id: id },
      });

      console.log(`[DELETE_PROJECT] Project ${id} deleted successfully`);
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json(
      { 
        message: "Project and all related data deleted successfully",
        projectId: id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PROJECT_DELETE_ERROR:", error);
    return NextResponse.json(
      { error: "An internal server error occurred", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
