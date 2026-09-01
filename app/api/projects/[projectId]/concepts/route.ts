import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: List all concepts for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify user has access to this project
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const concepts = await prisma.concept.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json(concepts);
  } catch (error) {
    console.error('Error fetching concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

// POST: Create a new concept for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate projectId exists
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Parse the request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { name, description, status = 'DRAFT' } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Verify user has access to this project
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

    // Check if concept with same name exists for this project
    const existingConcept = await prisma.concept.findFirst({
      where: {
        projectId,
        name: name.trim(),
      },
    });

    if (existingConcept) {
      return NextResponse.json(
        { error: 'A concept with this name already exists for this project' },
        { status: 409 }
      );
    }

    // Create the concept with proper relations
    const concept = await prisma.concept.create({
      data: {
        name: name.trim(),
        description: description?.trim() || undefined,
        status,
        project: {
          connect: { id: projectId }
        },
        agency: {
          connect: { id: user.agencyId }
        }
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
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Concept',
        entityId: concept.id,
        message: `Created concept "${concept.name}" for project "${project.name}"`,
        agencyId: user.agencyId,
        actorId: session.user.id,
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

// OPTIONS: Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}