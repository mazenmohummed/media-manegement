import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// ==========================================
// 1. GET A SINGLE PROJECT BY ID
// ==========================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

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
                salary: true,
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

    // Read saved values directly from DB — same as the projects list route
    // No recalculation needed; POST already stores the correct computed values
    const projectTotals = project.tasks.reduce(
      (acc, t) => ({
        totalProjectInvoice: acc.totalProjectInvoice + (t.totalInvoice || 0),
        totalProjectProfit:  acc.totalProjectProfit  + (t.taskNetProfit || 0),
        totalProjectCost:    acc.totalProjectCost    + (t.realCost || 0),
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

// ==========================================
// 2. DELETE A PROJECT BY ID (With Programmatic Cascade Cleanup)
// ==========================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user and get their agency ID
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json(
        { error: "Unauthorized: No Agency linked to user session" }, 
        { status: 401 }
      );
    }

    const { id } = await params;

    // 2. Security Check: Ensure the project exists AND belongs to this agency
    const existingProject = await prisma.project.findUnique({
      where: { id: id },
      select: { agencyId: true }
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

    // 3. Sequential Cleanup, Freelancer Reversal, and Deletion inside a safe Transaction
    await prisma.$transaction(async (tx) => {
      // Find all tasks related to this project along with their assignees who are FREELANCERS
      const tasks = await tx.task.findMany({
        where: { projectId: id },
        include: {
          assignees: {
            where: { userType: "FREELANCER" },
            select: { id: true, salary: true }
          }
        }
      });

      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length > 0) {
        // Loop through tasks and reverse freelancer salary updates
       // Loop through tasks and reverse freelancer salary updates safely
for (const task of tasks) {
  for (const freelancer of task.assignees) {
    const deductionAmount = parseFloat(freelancer.salary as any) || 0;
    
    if (deductionAmount > 0) {
      // 1. Fetch current database snapshot for the user to verify true balance state
      const currentUser = await tx.user.findUnique({
        where: { id: freelancer.id },
        select: { salary: true }
      });

      const currentSalary = currentUser?.salary || 0;
      // 2. Prevent dropping below 0
      const targetSalary = Math.max(0, currentSalary - deductionAmount);

      await tx.user.update({
        where: { id: freelancer.id },
        data: { salary: targetSalary }, // Absolute value set cleanly 
      });
    }
  }
}

        // Clear all expenses belonging to those tasks
        await tx.taskExpense.deleteMany({
          where: { taskId: { in: taskIds } }
        });

        // Clear all todos belonging to those tasks
        await tx.todo.deleteMany({
          where: { taskId: { in: taskIds } }
        });

        // Clear all tasks belonging to this project
        await tx.task.deleteMany({
          where: { projectId: id }
        });
      }

      // Finally, delete the project itself safely
      await tx.project.delete({
        where: { id: id }
      });
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json(
      { message: "Project deleted successfully and freelancer balances reversed" }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error("PROJECT_DELETE_ERROR:", error);
    return NextResponse.json(
      { error: "An internal server error occurred", details: error.message }, 
      { status: 500 }
    );
  }
}