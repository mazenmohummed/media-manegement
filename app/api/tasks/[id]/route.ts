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
      where: { 
        id: id,
        // SECURITY: Verify the task belongs to this agency
        agencyId: agencyId 
      },
      include: {
        project: true,
        assignee: {
          select: { name: true, email: true, role: true }
        },
        taskExpenses: true, // Updated from externalRentals
        assets: true, 
        comments: {
          include: { 
            author: { select: { name: true, role: true } } 
          },
          orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!task) return new NextResponse("Task not found", { status: 404 });
    
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
    const { status, progress, internalCost, margin, description, assigneeId } = body;

    // PERFORM SECURE UPDATE
    // Using updateMany or include agencyId in where ensures no cross-agency editing
    const updatedTask = await prisma.task.update({
      where: { 
        id: id,
        agencyId: agencyId // Ensure owner consistency
      },
      data: {
        status,
        progress: progress ? parseInt(progress) : undefined,
        internalCost: internalCost ? parseFloat(internalCost) : undefined,
        margin: margin ? parseFloat(margin) : undefined,
        description,
        assigneeId,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH_TASK_DETAIL_ERROR:", error);
    return new NextResponse("Update Failed", { status: 500 });
  }
}