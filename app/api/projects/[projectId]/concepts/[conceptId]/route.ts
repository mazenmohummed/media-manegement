import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: Fetch a single concept
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;

    const url = new URL(req.url);
    const includeBrief = url.searchParams.get('includeBrief') === 'true';

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Build the include object based on whether brief is requested
    const include: any = {
      assets: {
        include: {
          versions: {
            orderBy: { versionNo: 'desc' },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          projectName: true,
        },
      },
    };

    // Conditionally include brief
    if (includeBrief) {
      include.project.select.brief = true;
    }

    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      include,
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    return NextResponse.json(concept);
  } catch (error) {
    console.error('Error fetching concept:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concept' },
      { status: 500 }
    );
  }
}

// PATCH: Update a concept
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;
    const body = await req.json();
    const { name, description, status } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify concept exists and belongs to the project
    const existingConcept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    if (!existingConcept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingConcept.name) {
      const duplicate = await prisma.concept.findFirst({
        where: {
          projectId,
          name: name,
          id: { not: conceptId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A concept with this name already exists for this project' },
          { status: 409 }
        );
      }
    }

    // Validate status transitions
    const validStatuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        status: status || undefined,
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
        action: 'UPDATE',
        entityType: 'Concept',
        entityId: conceptId,
        message: `Updated concept "${updatedConcept.name}" for project "${existingConcept.project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
        metadata: {
          changes: {
            name: name || undefined,
            description: description !== undefined ? description : undefined,
            status: status || undefined,
          },
        },
      },
    });

    return NextResponse.json(updatedConcept);
  } catch (error) {
    console.error('Error updating concept:', error);
    return NextResponse.json(
      { error: 'Failed to update concept' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a concept
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      include: {
        project: {
          select: { name: true },
        },
        assets: true,
      },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Check if concept has assets before deletion
    if (concept.assets.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete concept with associated assets. Archive instead.' },
        { status: 409 }
      );
    }

    await prisma.concept.delete({
      where: { id: conceptId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'Concept',
        entityId: conceptId,
        message: `Deleted concept "${concept.name}" for project "${concept.project.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ message: 'Concept deleted successfully' });
  } catch (error) {
    console.error('Error deleting concept:', error);
    return NextResponse.json(
      { error: 'Failed to delete concept' },
      { status: 500 }
    );
  }
}