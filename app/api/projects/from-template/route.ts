import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ProjectStatus, TaskStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await request.json();
    const { templateId, projectName, clientId, contractId, targetDeadline } =
      body;

    if (!templateId || !projectName || !clientId) {
      return NextResponse.json(
        { error: "Template, project name, and client are required" },
        { status: 400 }
      );
    }

    const template = await db.projectTemplate.findUnique({
      where: { id: templateId, agencyId },
      include: { items: { orderBy: { order: "asc" } } },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const projectCount = await db.project.count({ where: { agencyId } });
    const projectNo = `PRJ-${new Date().getFullYear()}-${String(
      projectCount + 1
    ).padStart(4, "0")}`;

    const project = await db.$transaction(async (tx) => {
      // 1. Create project
      const newProject = await tx.project.create({
        data: {
          projectNo,
          name: projectName,
          projectName,
          status: ProjectStatus.DRAFT,
          agencyId,
          clientId,
          contractId: contractId || undefined,
          targetDeadline: targetDeadline ? new Date(targetDeadline) : undefined,
          currency: "EGP",
        },
      });

      // 2. Create milestones & tasks from template items
      // Group by milestone name to avoid duplicates
      const milestoneMap = new Map<string, string>();

      for (const item of template.items) {
        let milestoneId: string | undefined;

        if (item.milestoneName.trim()) {
          if (!milestoneMap.has(item.milestoneName)) {
            const milestone = await tx.milestone.create({
              data: {
                name: item.milestoneName,
                projectId: newProject.id,
                agencyId,
                order: item.order,
                budget: 0,
              },
            });
            milestoneMap.set(item.milestoneName, milestone.id);
          }
          milestoneId = milestoneMap.get(item.milestoneName);
        }

        if (item.taskTitle.trim()) {
          await tx.task.create({
            data: {
              taskType: item.taskType || "General",
              title: item.taskTitle,
              description: item.description,
              estimatedHours: item.estimatedHours,
              status: TaskStatus.PENDING,
              projectId: newProject.id,
              agencyId,
              milestoneId,
              categoryId: item.categoryId || undefined,
            },
          });
        }
      }

      return newProject;
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("[PROJECT_FROM_TEMPLATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create project from template" },
      { status: 500 }
    );
  }
}