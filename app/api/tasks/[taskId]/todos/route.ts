import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await the params promise
  const { taskId } = await params;

  const todos = await db.todo.findMany({
    where: {
      taskId: taskId,
      agencyId: session.user.agencyId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
    orderBy: [{ completed: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ todos });
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Todo text is required" }, { status: 400 });
    }

    // Await the params promise here too
    const { taskId } = await params;

    const maxOrder = await db.todo.findFirst({
      where: { taskId: taskId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const todo = await db.todo.create({
      data: {
        text: body.text.trim(),
        description: body.description?.trim() || null,
        priority: body.priority || "MEDIUM",
        order: (maxOrder?.order ?? -1) + 1,
        taskId: taskId, // Now safely defined
        agencyId: session.user.agencyId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (err: any) {
    console.error("Create todo error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}