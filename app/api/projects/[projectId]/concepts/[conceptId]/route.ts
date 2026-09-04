// app/api/projects/[projectId]/concepts/[conceptId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;
    const agencyId = session.user.agencyId;

    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId,
      },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                clientName: true,
                email: true,
              },
            },
          },
        },
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
            },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
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

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    // 🔒 Check if project has a client
    if (!concept.project.clientId) {
      console.warn('Concept has no client associated:', conceptId);
    }

    // Return with all data including brief
    return NextResponse.json({
      id: concept.id,
      name: concept.name,
      description: concept.description,
      brief: concept.brief, // ✅ Include brief directly from concept
      status: concept.status,
      projectId: concept.projectId,
      projectName: concept.project.projectName,
      // ✅ Include client data
      clientId: concept.project.clientId,
      clientName: concept.project.client?.clientName || null,
      clientEmail: concept.project.client?.email || null,
      // ✅ Include assets
      assets: concept.assets,
      // ✅ Include task and milestone
      task: concept.task,
      milestone: concept.milestone,
      createdAt: concept.createdAt,
      updatedAt: concept.updatedAt,
    });
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
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;
    const agencyId = session.user.agencyId;
    const body = await req.json();
    const { name, description, brief, status, taskId, milestoneId } = body;

    // Verify concept exists and belongs to the project
    const existingConcept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId,
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

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (brief !== undefined) updateData.brief = brief; // ✅ Update brief directly
    if (status !== undefined) updateData.status = status;
    if (taskId !== undefined) updateData.taskId = taskId;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId;

    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: updateData,
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

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Concept',
        entityId: conceptId,
        message: `Updated concept "${updatedConcept.name}" for project "${existingConcept.project.name}"`,
        agencyId: agencyId,
        actorId: session.user.id,
        metadata: {
          changes: {
            name: name || undefined,
            description: description !== undefined ? description : undefined,
            brief: brief !== undefined ? brief : undefined,
            status: status || undefined,
            taskId: taskId || undefined,
            milestoneId: milestoneId || undefined,
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
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { projectId, conceptId } = await params;
    const agencyId = session.user.agencyId;

    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId,
      },
      include: {
        project: {
          select: { name: true },
        },
        assets: true,
        reviewLinks: {
          where: { isActive: true },
        },
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

    // Check if concept has active review links
    if (concept.reviewLinks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete concept with active review links. Deactivate them first.' },
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
        agencyId: agencyId,
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