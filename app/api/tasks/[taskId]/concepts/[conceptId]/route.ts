// app/api/tasks/[taskId]/concepts/[conceptId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// PATCH - Link or unlink concept from task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, conceptId } = await params;
    const body = await req.json();
    const { link } = body;

    // Verify task exists
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
      },
      select: { projectId: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify concept exists and belongs to the same project
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId: task.projectId,
        agencyId: session.user.agencyId,
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found or does not belong to this project' },
        { status: 404 }
      );
    }

    // Update the concept's taskId based on link parameter
    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        taskId: link ? taskId : null,
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
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Concept',
        entityId: conceptId,
        message: link 
          ? `Linked concept "${concept.name}" to task ${taskId}`
          : `Unlinked concept "${concept.name}" from task ${taskId}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          taskId,
          link,
        },
      },
    });

    return NextResponse.json(updatedConcept);

  } catch (error) {
    console.error('Error updating concept link:', error);
    return NextResponse.json(
      { error: 'Failed to update concept link' },
      { status: 500 }
    );
  }
}

// DELETE - Delete concept (only if not linked to anything else)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, conceptId } = await params;

    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        taskId: taskId,
        agencyId: session.user.agencyId,
      },
      include: {
        assets: true,
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    if (concept.assets.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete concept with assets. Archive instead.' },
        { status: 409 }
      );
    }

    await prisma.concept.delete({
      where: { id: conceptId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting concept:', error);
    return NextResponse.json(
      { error: 'Failed to delete concept' },
      { status: 500 }
    );
  }
}