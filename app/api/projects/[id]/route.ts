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

    // Cascade cleanup + freelancer wallet reversal in transaction
    await prisma.$transaction(async (tx) => {
      // Fetch all tasks with their freelancer assignees
      const tasks = await tx.task.findMany({
        where: { projectId: id },
        include: {
          assignees: {
            where: { userType: "FREELANCER" },
            select: { id: true, walletBalance: true },
          },
        },
      });

      const taskIds = tasks.map((t) => t.id);

      // Reverse freelancer wallet balances (subtract what was added)
      for (const task of tasks) {
        for (const freelancer of task.assignees) {
          const currentBalance = freelancer.walletBalance || 0;

          // Fetch the FinancialTransaction records for this task+freelancer to know how much to reverse
          const txns = await tx.financialTransaction.findMany({
            where: {
              userId: freelancer.id,
              taskId: task.id,
            },
            select: { amount: true },
          });

          const totalToReverse = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
          const newBalance = Math.max(0, currentBalance - totalToReverse);

          await tx.user.update({
            where: { id: freelancer.id },
            data: { walletBalance: newBalance },
          });
        }
      }

      // Clean up task-related records
      if (taskIds.length > 0) {
        await tx.taskExpense.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.todo.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.financialTransaction.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.task.deleteMany({ where: { projectId: id } });
      }

      // Delete project
      await tx.project.delete({ where: { id: id } });
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json(
      { message: "Project deleted successfully and freelancer wallets reversed" },
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