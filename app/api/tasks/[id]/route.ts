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
    const agencyId = session?.user?.agencyId;
    const { id } = await params;

    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: id, agencyId: agencyId },
      include: {
        project: true,
        agency: { include: { users: true } },
        assignees: { 
          select: { id: true, name: true, userType: true } 
        },
        todos: { orderBy: { createdAt: 'asc' } },
        taskExpenses: true,
        assets: true,
        comments: {
          include: { author: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        },
        attendanceLogs: {
          include: { user: true },
          orderBy: { checkInTime: 'desc' }
        }
      },
    });

    if (!task) return new NextResponse("Task not found", { status: 404 });

    // 1. Sync progress if todos exist
    if (task.todos.length > 0) {
      const newProgress = Math.round((task.todos.filter(t => t.completed).length / task.todos.length) * 100);
      if (newProgress !== task.progress) {
        await prisma.task.update({ where: { id }, data: { progress: newProgress } });
      }
    }

    // 2. FINANCIAL RECALCULATION LOGIC
    const primaryAssignee = task.assignees?.[0];
    const userType = primaryAssignee?.userType || "FREELANCER";
    
    const sumExpenses = task.taskExpenses.reduce((sum, e) => sum + e.cost, 0);
    const internalCost = task.internalCost || 0;
    const marginPercent = task.margin || 0;

    // marginAmount = ((internalCost + expenses) * margin) / 100
    const marginAmount = ((internalCost + sumExpenses) * marginPercent) / 100;
    
    // totalValue = internalCost + expenses + marginAmount
    const totalValue = internalCost + sumExpenses + marginAmount;

    let taskNetProfit = 0;
    let realCost = 0;

    if (userType === "FULL_TIME" || userType === "PART_TIME") {
      taskNetProfit = totalValue - sumExpenses;
      realCost = sumExpenses;
    } else {
      // FREELANCER
      taskNetProfit = marginAmount;
      realCost = sumExpenses + internalCost;
    }

    // 3. Update task with the calculated values
    const updatedTask = await prisma.task.update({
      where: { id: id }, 
      data: { 
        marginAmount,
        totalValue,
        taskNetProfit,
        realCost
      },
      include: { 
        project: true,
        agency: { include: { users: true } },
        assignees: true,
        taskExpenses: true,
        assets: true,
        attendanceLogs: { include: { user: true } },
        comments: { include: { author: true } },
        todos: { orderBy: { createdAt: 'asc' } } 
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("GET_TASK_DETAIL_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const { id } = await params;
    
    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { status, progress, internalCost, margin, description, assigneeIds } = body;

    const updatedTask = await prisma.task.update({
      where: { id: id, agencyId: agencyId },
      data: {
        status,
        progress: progress !== undefined ? parseInt(progress) : undefined,
        internalCost: internalCost !== undefined ? parseFloat(internalCost) : undefined,
        margin: margin !== undefined ? parseFloat(margin) : undefined,
        description,
        assignees: assigneeIds ? {
          set: assigneeIds.map((userId: string) => ({ id: userId }))
        } : undefined,
      },
      include: {
        project: true,
        agency: { include: { users: true } },
        assignees: true
      }
    });

    // Notification Logic
    if (status === "COMPLETED" || parseInt(progress) === 100) {
      const admins = updatedTask.agency.users.filter(u => u.role === "ADMIN");
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            title: "Task Finished",
            message: `Task for project ${updatedTask.project?.projectName} completed by ${session?.user?.name || "a user"}.`,
            type: "SYSTEM",
            userId: admin.id,
            agencyId: agencyId,
            isRead: false,
          }))
        });
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH_TASK_DETAIL_ERROR:", error);
    return new NextResponse("Update Failed", { status: 500 });
  }
}