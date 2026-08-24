import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ taskId: string; todoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Await the params promise to unwrap todoId and taskId
    const { taskId, todoId } = await params;
    const body = await req.json();

    // 2. Optional: Verify the todo exists and belongs to the correct agency & task first
    const existingTodo = await db.todo.findUnique({
      where: { id: todoId, taskId: taskId, agencyId: session.user.agencyId },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const todo = await db.todo.update({
      where: {
        id: todoId, // Unique identifier required by Prisma
      },
      data: {
        completed: body.completed,
        text: body.text?.trim(),
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    return NextResponse.json(todo);
  } catch (err: any) {
    console.error("Update todo error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ taskId: string; todoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Await the params promise here as well
    const { taskId, todoId } = await params;

    // 2. Verify existence and ownership before deleting
    const existingTodo = await db.todo.findUnique({
      where: { id: todoId, taskId: taskId, agencyId: session.user.agencyId },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await db.todo.delete({
      where: {
        id: todoId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete todo error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}