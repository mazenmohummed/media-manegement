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
      where: {
        id: projectId,
        agencyId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
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

    // Create the production task
    const task = await prisma.task.create({
      data: {
        taskNo: `PRD-${Date.now()}`,
        title: title.trim(),
        description: description?.trim() || null,
        taskType: 'PRODUCTION',
        status: 'PENDING',
        priority: priority || 'MEDIUM',
        projectId,
        conceptId,
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
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