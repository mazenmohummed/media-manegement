import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { TaskStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const agencyId = session.user.agencyId;
    const body = await request.json();
    const { milestones } = body;

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { agencyId: true, id: true },
    });

    if (!project || project.agencyId !== agencyId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      for (const m of milestones) {
        if (!m.name?.trim()) continue;

        const milestone = await tx.milestone.create({
          data: {
            name: m.name.trim(),
            projectId,
            agencyId,
            order: m.order || 0,
            budget: 0,
          },
        });

        for (const t of m.tasks || []) {
          if (!t.title?.trim()) continue;
          await tx.task.create({
            data: {
              taskType: t.taskType?.trim() || "General",
              title: t.title.trim(),
              estimatedHours: t.estimatedHours || 0,
              status: TaskStatus.PENDING,
              projectId,
              agencyId,
              milestoneId: milestone.id,
            },
          });
        }
      }
    });

    return NextResponse.json({ message: "WBS created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("[WBS_CREATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create WBS" },
      { status: 500 }
    );
  }
}