// app/api/projects/[projectId]/concepts/route.ts - COMPLETE FIXED VERSION

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// GET - List all concepts for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const available = searchParams.get('available') === 'true';
    const excludeTask = searchParams.get('excludeTask');
    const excludeMilestone = searchParams.get('excludeMilestone');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {
      projectId: projectId,
      agencyId: session.user.agencyId,
      status: { not: 'ARCHIVED' },
    };

    // ✅ If available=true, return concepts that are NOT linked to this milestone
    if (available) {
      // Build exclusion conditions
      const excludeConditions: any[] = [];

      // 1. Exclude concepts directly linked to this milestone
      if (excludeMilestone) {
        excludeConditions.push({ milestoneId: excludeMilestone });
      }

      // 2. Exclude concepts linked to tasks that belong to this milestone
      if (excludeMilestone) {
        excludeConditions.push({
          task: {
            milestoneId: excludeMilestone
          }
        });
      }

      // 3. Exclude concepts linked to the specific task
      if (excludeTask) {
        excludeConditions.push({ taskId: excludeTask });
      }

      if (excludeConditions.length > 0) {
        // Use NOT with OR conditions to exclude everything
        where.NOT = {
          OR: excludeConditions
        };
      }
      
      // ✅ IMPORTANT: We DO NOT add { taskId: null } or { milestoneId: null }
      // because we want to include concepts linked to tasks in OTHER milestones
    }

    const concepts = await prisma.concept.findMany({
      where,
      include: {
        assets: {
          select: {
            id: true,
            name: true,
            type: true,
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
        task: {
          select: {
            id: true,
            title: true,
            taskNo: true,
            milestoneId: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Format response
    const formattedConcepts = concepts.map((concept) => ({
      id: concept.id,
      name: concept.name,
      description: concept.description,
      brief: concept.brief,
      status: concept.status,
      assetCount: concept.assets.length,
      hasActiveReview: concept.reviewLinks.some(r => r.isActive),
      linkedTask: concept.task ? {
        id: concept.task.id,
        title: concept.task.title,
        taskNo: concept.task.taskNo,
        milestoneId: concept.task.milestoneId,
      } : null,
      linkedMilestone: concept.milestone ? {
        id: concept.milestone.id,
        name: concept.milestone.name,
      } : null,
      createdAt: concept.createdAt,
      updatedAt: concept.updatedAt,
    }));

    return NextResponse.json({
      concepts: formattedConcepts,
      total: formattedConcepts.length,
      data: formattedConcepts,
    });

  } catch (error) {
    console.error('Error fetching project concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

// POST - Create a new concept for a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { name, description, brief, status = 'DRAFT', taskId, milestoneId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const existingConcept = await prisma.concept.findFirst({
      where: {
        projectId,
        name: name.trim(),
        agencyId: user.agencyId,
      },
    });

    if (existingConcept) {
      return NextResponse.json(
        { error: 'A concept with this name already exists for this project' },
        { status: 409 }
      );
    }

    const data: any = {
      name: name.trim(),
      description: description?.trim() || null,
      brief: brief?.trim() || null,
      status: status || 'DRAFT',
      projectId: projectId,
      agencyId: user.agencyId,
    };

    if (taskId) {
      data.taskId = taskId;
    }

    if (milestoneId) {
      data.milestoneId = milestoneId;
    }

    const concept = await prisma.concept.create({
      data,
      include: {
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            taskNo: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Concept',
        entityId: concept.id,
        message: `Created concept "${concept.name}" for project "${project.name}"`,
        agencyId: user.agencyId,
        actorId: session.user.id,
        metadata: {
          taskId: taskId || null,
          milestoneId: milestoneId || null,
        },
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

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}