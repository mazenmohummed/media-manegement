// app/api/tasks/[id]/todos/[todoId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { todoId } = await params;
    const { completed } = await req.json();

    const updatedTodo = await prisma.todo.update({
      where: { 
        id: todoId,
        // Safety check: ensure it belongs to the user's agency
        agencyId: session.user.agencyId 
      },
      data: { completed },
    });

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("TODO_PATCH_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}