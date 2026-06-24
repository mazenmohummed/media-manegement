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
          select: { id: true, name: true, userType: true, salary: true } 
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
        const updatedTaskWithProgress = await prisma.task.update({ 
          where: { id }, 
          data: { progress: newProgress },
          include: {
            project: true,
            agency: { include: { users: true } },
            assignees: { select: { id: true, name: true, userType: true, salary: true } },
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
          }
        });
        return NextResponse.json(updatedTaskWithProgress);
      }
    }

    return NextResponse.json(task);
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

export async function DELETE(
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

    const existingProject = await prisma.project.findUnique({
      where: { id: id }
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

    await prisma.project.delete({
      where: { id: id }
    });

    return NextResponse.json(
      { message: "Project deleted successfully" }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error("ROUTE_ERROR_DELETE_PROJECT:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" }, 
      { status: 500 }
    );
  }
}