// app/api/tasks/production/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { validateProductionAccess } from '@/lib/approval-gate';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await req.json();

    const {
      title,
      description,
      projectId,
      conceptId,
      milestoneId,
      categoryId,
      priority,
      dueDate,
      assigneeIds,
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Concept ID is required for production tasks' },
        { status: 400 }
      );
    }

    // Verify project belongs to agency
    const project = await prisma.project.findFirst({
      where: { id: projectId, agencyId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify the concept belongs to this project & agency before linking
    const concept = await prisma.concept.findFirst({
      where: { id: conceptId, projectId, agencyId },
      select: { id: true, taskId: true },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    if (concept.taskId) {
      return NextResponse.json(
        { error: 'Concept is already linked to a production task' },
        { status: 409 }
      );
    }

    // 🔒 APPROVAL GATE: Check if concept is approved for production
    try {
      await validateProductionAccess(conceptId, 'create production task');
    } catch (gateError: any) {
      return NextResponse.json(
        {
          error: 'Production blocked',
          details: gateError.message,
          type: 'APPROVAL_REQUIRED',
        },
        { status: 403 }
      );
    }

    // ✅ Create task and link concept atomically.
    //    `conceptId` is not on Task — we set `Concept.taskId` instead.
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          taskNo: `PRD-${Date.now()}`,
          title: title.trim(),
          description: description?.trim() || null,
          taskType: 'PRODUCTION',
          status: 'PENDING',
          priority: priority || 'MEDIUM',
          projectId,
          milestoneId: milestoneId || null,
          categoryId: categoryId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          agencyId,
          assignees: {
            connect: assigneeIds?.map((id: string) => ({ id })) || [],
          },
        },
        include: {
          assignees: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          // ✅ plural: Task has `concepts Concept[]`
          concepts: {
            select: { id: true, name: true, status: true },
          },
        },
      });

      // Link the concept to the new task (FK lives on Concept.taskId)
      await tx.concept.update({
        where: { id: conceptId },
        data: { taskId: created.id },
      });

      // Re-read to include the now-linked concept
      return tx.task.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          assignees: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          concepts: {
            select: { id: true, name: true, status: true },
          },
        },
      });
    });

    // Create notification for assignees
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.notification.createMany({
        data: assigneeIds.map((userId: string) => ({
          title: 'Production Task Assigned',
          message: `You've been assigned to production task: ${title}`,
          type: 'ASSIGNMENT',
          actionUrl: `/dashboard/tasks/${task.id}`,
          userId,
          agencyId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      task,
      message: 'Production task created successfully',
    });
  } catch (error) {
    console.error('Error creating production task:', error);
    return NextResponse.json(
      { error: 'Failed to create production task' },
      { status: 500 }
    );
  }
}