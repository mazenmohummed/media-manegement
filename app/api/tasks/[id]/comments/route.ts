import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    const userId = session?.user?.id;
    const { id: taskId } = await params;

    // 1. SECURITY & AUTH CHECK
    if (!agencyId || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { text } = await req.json();
    if (!text) return new NextResponse("Comment text is required", { status: 400 });

    // 2. VERIFY TASK OWNERSHIP
    // Ensure the task actually belongs to this user's agency
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        agencyId: agencyId 
      }
    });

    if (!task) {
      return new NextResponse("Task not found or unauthorized", { status: 404 });
    }

    // 3. CREATE SECURE COMMENT
    const comment = await prisma.comment.create({
      data: {
        text,
        taskId: taskId,
        authorId: userId,  // Automatically set from session
        agencyId: agencyId, // Critical for cross-agency filtering
      },
      include: {
        author: {
          select: { name: true, role: true } // Include author info for the UI
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error("COMMENT_POST_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}