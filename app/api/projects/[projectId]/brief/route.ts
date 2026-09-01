import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: Fetch the creative brief for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify project exists and belongs to the agency
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

    const brief = await prisma.creativeBrief.findUnique({
      where: { projectId },
    });

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    return NextResponse.json(brief);
  } catch (error) {
    console.error('Error fetching brief:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brief' },
      { status: 500 }
    );
  }
}

// POST: Create a new creative brief for a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json();
    const { title, objectives, audience, keyMessage, budget, deliverables, references } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!objectives || !objectives.trim()) {
      return NextResponse.json(
        { error: 'Objectives are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify project exists and belongs to the agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if brief already exists
    const existingBrief = await prisma.creativeBrief.findUnique({
      where: { projectId },
    });

    if (existingBrief) {
      return NextResponse.json(
        { error: 'A brief already exists for this project' },
        { status: 409 }
      );
    }

    const brief = await prisma.creativeBrief.create({
      data: {
        title: title.trim(),
        objectives: objectives.trim(),
        audience: audience?.trim() || null,
        keyMessage: keyMessage?.trim() || null,
        budget: budget || null,
        deliverables: deliverables || [],
        references: references || [],
        project: {
          connect: { id: projectId }
        }
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'CreativeBrief',
        entityId: brief.id,
        message: `Created creative brief "${brief.title}" for project "${project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json(brief, { status: 201 });
  } catch (error) {
    console.error('Error creating brief:', error);
    return NextResponse.json(
      { error: 'Failed to create brief' },
      { status: 500 }
    );
  }
}

// PATCH: Update a creative brief
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json();
    const { title, objectives, audience, keyMessage, budget, deliverables, references } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify project exists and belongs to the agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if brief exists
    const existingBrief = await prisma.creativeBrief.findUnique({
      where: { projectId },
    });

    if (!existingBrief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (objectives !== undefined) updateData.objectives = objectives?.trim() || null;
    if (audience !== undefined) updateData.audience = audience?.trim() || null;
    if (keyMessage !== undefined) updateData.keyMessage = keyMessage?.trim() || null;
    if (budget !== undefined) updateData.budget = budget;
    if (deliverables !== undefined) updateData.deliverables = deliverables;
    if (references !== undefined) updateData.references = references;

    const brief = await prisma.creativeBrief.update({
      where: { projectId },
      data: updateData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeBrief',
        entityId: brief.id,
        message: `Updated creative brief for project "${project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    return NextResponse.json(brief);
  } catch (error) {
    console.error('Error updating brief:', error);
    return NextResponse.json(
      { error: 'Failed to update brief' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a creative brief
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify project exists and belongs to the agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if brief exists
    const existingBrief = await prisma.creativeBrief.findUnique({
      where: { projectId },
    });

    if (!existingBrief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    await prisma.creativeBrief.delete({
      where: { projectId },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeBrief',
        entityId: existingBrief.id,
        message: `Deleted creative brief for project "${project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ message: 'Brief deleted successfully' });
  } catch (error) {
    console.error('Error deleting brief:', error);
    return NextResponse.json(
      { error: 'Failed to delete brief' },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PATCH, DELETE, OPTIONS',
    },
  });
}