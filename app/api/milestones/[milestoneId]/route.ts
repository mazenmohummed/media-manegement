import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Helper: fetch milestone with computed fields
async function getMilestoneDetail(milestoneId: string, agencyId: string) {
  const milestone = await db.milestone.findFirst({
    where: { id: milestoneId, agencyId },
    include: {
      project: { select: { id: true, name: true, projectNo: true } },
      tasks: {
        where: { deletedAt: null },
        include: {
          assignees: { select: { id: true, name: true, avatarUrl: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { comments: true, todos: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!milestone) return null;

  const totalTasks = milestone.tasks.length;
  const completedTasks = milestone.tasks.filter((t) => t.status === "COMPLETED").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    ...milestone,
    totalTasks,
    completedTasks,
    progress,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { milestoneId } = await params;

  const data = await getMilestoneDetail(milestoneId, session.user.agencyId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { milestoneId } = await params;
  const body = await req.json();

  // Verify ownership before updating
  const existing = await db.milestone.findFirst({
    where: { id: milestoneId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  const data = await getMilestoneDetail(milestoneId, session.user.agencyId);
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { milestoneId } = await params;

  const existing = await db.milestone.findFirst({
    where: { id: milestoneId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.milestone.delete({ where: { id: milestoneId } });
  return NextResponse.json({ success: true });
}