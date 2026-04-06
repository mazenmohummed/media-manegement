// app/api/tasks/[id]/todos/route.ts
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
    if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    const todos = await prisma.todo.findMany({
      where: {
        taskId: id,
        agencyId: session.user.agencyId,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(todos);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    if (!agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { text, priority } = body;

    const todo = await prisma.todo.create({
      data: {
        text,
        priority: priority || "MEDIUM",
        taskId: id,
        agencyId: agencyId, // Required by your model
        completed: false,
      },
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error("TODO_POST_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}