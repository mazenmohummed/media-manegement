import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const body = await req.json();
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id: taskId, agencyId: session.user.agencyId },
      data: {
        assignees: { connect: { id: body.userId } },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        title: "Task Assigned",
        message: `You were assigned to a task`,
        type: "ASSIGNMENT",
        userId: body.userId,
        agencyId: session.user.agencyId,
        actionUrl: `/dashboard/tasks/${taskId}`,
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id: taskId, agencyId: session.user.agencyId },
      data: {
        assignees: { disconnect: { id: userId } },
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}