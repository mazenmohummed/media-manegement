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

  // Unwrap params
  const { taskId } = await params;

  try {
    const comments = await db.comment.findMany({
      where: {
        taskId: taskId,
        agencyId: session.user.agencyId,
      },
      include: {
        author: { 
          select: { id: true, name: true, email: true, avatarUrl: true, role: true } 
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (err: any) {
    console.error("Get comments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
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
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    // Unwrap params to get taskId safely
    const { taskId } = await params;

    const comment = await db.comment.create({
      data: {
        text: body.text.trim(),
        taskId: taskId, // Safely resolved string
        agencyId: session.user.agencyId,
        authorId: session.user.id,
      },
      include: {
        author: { 
          select: { id: true, name: true, email: true, avatarUrl: true, role: true } 
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    console.error("Create comment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}