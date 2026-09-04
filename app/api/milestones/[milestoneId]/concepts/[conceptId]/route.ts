// app/api/milestones/[milestoneId]/concepts/[conceptId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// PATCH - Link or unlink concept from milestone
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestoneId, conceptId } = await params;
    const body = await req.json();
    const { link } = body;

    // Verify milestone exists and belongs to agency
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        agencyId: session.user.agencyId,
      },
      select: { projectId: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verify concept exists and belongs to the same project
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId: milestone.projectId,
        agencyId: session.user.agencyId,
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found or does not belong to this project' },
        { status: 404 }
      );
    }

    // Update the concept's milestoneId based on link parameter
    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        milestoneId: link ? milestoneId : null,
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
          ? `Linked concept "${concept.name}" to milestone ${milestoneId}`
          : `Unlinked concept "${concept.name}" from milestone ${milestoneId}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          milestoneId,
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