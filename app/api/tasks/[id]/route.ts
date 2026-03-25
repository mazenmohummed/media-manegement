import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id: id },
      include: {
        project: true,
        assignee: true,
        externalRentals: true,
        assets: true, 
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!task) return new NextResponse("Task not found", { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // 1. Define as Promise
) {
  try {
    const { id } = await params; // 2. Await the params
    const body = await req.json();
    
    const { status, progress, grossRevenue, margin, description, assigneeId } = body;

    const updatedTask = await db.task.update({
      where: { id: id },
      data: {
        status,
        progress: parseInt(progress),
        grossRevenue: parseFloat(grossRevenue),
        margin: parseFloat(margin),
        description,
        assigneeId,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    return new NextResponse("Update Failed", { status: 500 });
  }
}