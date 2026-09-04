// app/api/tasks/[taskId]/concepts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// GET - Get all concepts for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const concepts = await prisma.concept.findMany({
      where: {
        taskId: taskId,
        agencyId: session.user.agencyId,
      },
      include: {
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
        reviewLinks: {
          where: { isActive: true },
          select: {
            id: true,
            token: true,
            status: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ concepts });

  } catch (error) {
    console.error('Error fetching task concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

// POST - Create a concept linked to a task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();
    const { name, description, brief } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Concept name is required' },
        { status: 400 }
      );
    }

    // Get the task to get project and agency info
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
      },
      select: {
        projectId: true,
        agencyId: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const concept = await prisma.concept.create({
      data: {
        name: name.trim(),
        description: description || null,
        brief: brief || null,
        taskId: taskId,
        projectId: task.projectId,
        agencyId: task.agencyId,
        status: 'DRAFT',
      },
      include: {
        assets: true,
      },
    });

    return NextResponse.json(concept, { status: 201 });

  } catch (error) {
    console.error('Error creating concept:', error);
    return NextResponse.json(
      { error: 'Failed to create concept' },
      { status: 500 }
    );
  }
}