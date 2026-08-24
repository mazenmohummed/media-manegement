import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: any = {
    agencyId: session.user.agencyId,
  };

  if (projectId) where.projectId = projectId;
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const milestones = await db.milestone.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNo: true } },
      tasks: {
        where: { deletedAt: null },
        select: { id: true, progress: true, status: true },
      },
      _count: {
        select: { tasks: { where: { deletedAt: null } } },
      },
    },
    orderBy: [{ project: { name: "asc" } }, { order: "asc" }],
  });

  const enriched = milestones.map((m) => {
    const totalProgress = m.tasks.reduce((sum, t) => sum + t.progress, 0);
    const progress = m.tasks.length > 0 ? Math.round(totalProgress / m.tasks.length) : 0;
    const completedTasks = m.tasks.filter((t) => t.status === "COMPLETED").length;
    return {
      ...m,
      progress,
      completedTasks,
      totalTasks: m.tasks.length,
    };
  });

  return NextResponse.json({ milestones: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, projectId, deadline, order } = body;

    if (!name?.trim() || !projectId) {
      return NextResponse.json({ error: "Name and project are required" }, { status: 400 });
    }

    const milestone = await db.milestone.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        projectId,
        agencyId: session.user.agencyId,
        status: "PENDING",
        deadline: deadline ? new Date(deadline) : null,
        order: order ?? 0,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (err: any) {
    console.error("Create milestone error:", err);
    return NextResponse.json({ error: err.message || "Failed to create milestone" }, { status: 500 });
  }
}