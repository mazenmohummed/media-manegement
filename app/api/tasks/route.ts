// app/api/tasks/route.ts
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
  const priority = searchParams.get("priority");
  const milestoneId = searchParams.get("milestoneId");
  const q = searchParams.get("q");
  const exclude = searchParams.get("exclude");
  const tagId = searchParams.get("tagId"); // ✅ Added tag filter

  const where: any = {
    agencyId: session.user.agencyId,
    deletedAt: null,
  };

  if (projectId && projectId !== "ALL") where.projectId = projectId;
  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (milestoneId && milestoneId !== "ALL") where.milestoneId = milestoneId;
  if (exclude) where.id = { not: exclude };
  
  // ✅ Tag filtering
  if (tagId && tagId !== "ALL") {
    where.tags = {
      some: { id: tagId }
    };
  }
  
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { taskNo: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      assignees: { select: { id: true, name: true, avatarUrl: true } },
      category: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true, order: true, projectId: true } },
      project: { select: { id: true, name: true, projectName: true } },
      tags: { select: { id: true, name: true, color: true } }, // ✅ Include tags
      _count: { select: { comments: true, todos: true } },
    },
    orderBy: [{ milestone: { order: "asc" } }, { createdAt: "desc" }],
  });

  // Fetch projects and their milestones hierarchically
  const projectWhere: any = { agencyId: session.user.agencyId, deletedAt: null };
  if (projectId && projectId !== "ALL") projectWhere.id = projectId;

  const projects = await db.project.findMany({
    where: projectWhere,
    select: { id: true, name: true, projectName: true },
  });

  const allMilestones = await db.milestone.findMany({
    where: { 
      agencyId: session.user.agencyId, 
      ...(projectId && projectId !== "ALL" ? { projectId } : {}) 
    },
    include: {
      tasks: {
        where: { deletedAt: null },
        select: { progress: true },
      },
    },
    orderBy: { order: "asc" },
  });

  // Structure: Projects -> Milestones -> Tasks
  const structuredProjects = projects.map((proj) => {
    const projMilestones = allMilestones.filter((m) => m.projectId === proj.id);

    const milestonesWithProgress = projMilestones.map((m) => {
      const totalProgress = m.tasks.reduce((sum, t) => sum + t.progress, 0);
      const progress = m.tasks.length > 0 ? Math.round(totalProgress / m.tasks.length) : 0;
      return {
        milestone: {
          id: m.id,
          name: m.name,
          order: m.order,
          status: m.status,
          progress,
        },
        tasks: tasks.filter((t) => t.milestoneId === m.id),
      };
    });

    // Project-level ungrouped tasks
    const ungroupedTasks = tasks.filter((t) => t.projectId === proj.id && !t.milestoneId);

    return {
      project: proj,
      milestones: milestonesWithProgress,
      ungroupedTasks,
    };
  });

  // Handle tasks completely unassigned to any project if applicable
  const globalUngroupedTasks = tasks.filter((t) => !t.projectId);
  if (globalUngroupedTasks.length > 0) {
    structuredProjects.push({
      project: { id: "ungrouped", name: "Ungrouped Tasks", projectName: "Ungrouped Tasks" },
      milestones: [],
      ungroupedTasks: globalUngroupedTasks,
    });
  }

  return NextResponse.json({ 
    tasks, 
    projects: structuredProjects, 
    rawProjects: projects 
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      title, 
      description, 
      projectId, 
      milestoneId, 
      categoryId, 
      priority, 
      dueDate, 
      assigneeIds,
      tagIds // ✅ Added tagIds
    } = body;

    if (!title?.trim() || !projectId) {
      return NextResponse.json({ error: "Title and project are required" }, { status: 400 });
    }

    const count = await db.task.count({ where: { agencyId: session.user.agencyId } });
    const taskNo = `TSK-${String(count + 1).padStart(4, "0")}`;

    const task = await db.task.create({
      data: {
        taskNo,
        title: title.trim(),
        description: description?.trim() || null,
        taskType: "STANDARD",
        status: "PENDING",
        priority: priority || "MEDIUM",
        projectId,
        milestoneId: milestoneId || null,
        categoryId: categoryId || null,
        agencyId: session.user.agencyId,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignees: assigneeIds?.length
          ? { connect: assigneeIds.map((id: string) => ({ id })) }
          : undefined,
        // ✅ Add tags if provided
        tags: tagIds?.length
          ? { connect: tagIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        assignees: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } }, // ✅ Include tags
      },
    });

    // Trigger assignment notifications if assignees are present
    if (assigneeIds && assigneeIds.length > 0) {
      for (const assigneeId of assigneeIds) {
        await db.notification.create({
          data: {
            userId: assigneeId,
            agencyId: session.user.agencyId,
            title: "New Task Assigned",
            message: `You have been assigned to task: ${task.title} (${task.taskNo})`,
            type: "ASSIGNMENT",
            actionUrl: `/dashboard/tasks/${task.id}`,
          },
        });
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 });
  }
}