import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conceptId } = await params;
    const agencyId = session.user.agencyId;

    // 2. Fetch the concept and ensure it belongs to the agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        agencyId: agencyId,
        deletedAt: null, // Ensure it's not already deleted
      },
      include: {
        // 3. Check for active client-facing links
        reviewLinks: {
          where: { 
            isActive: true,
            status: 'ACTIVE',
          },
          select: { 
            id: true, 
            expiresAt: true, 
            status: true,
            isActive: true,
          },
        },
        // 4. Check related tasks/milestones to prevent breaking active workflows
        task: {
          select: { id: true, status: true },
        },
        milestone: {
          select: { id: true, status: true },
        },
        // 5. Check for assets
        assets: {
          where: { deletedAt: null }, // Only active assets
          select: { id: true },
        },
      },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // 🔒 EDGE CASE 1: Block archiving if active ReviewLinks exist (prevent client access leaks)
    // Since we already filtered for isActive: true and status: 'ACTIVE' in the where clause,
    // we just need to check if any reviewLinks exist and are not expired
    const hasActiveLinks = concept.reviewLinks.some((link) => {
      const isNotExpired = !link.expiresAt || link.expiresAt > new Date();
      return link.isActive && link.status === 'ACTIVE' && isNotExpired;
    });

    if (hasActiveLinks) {
      return NextResponse.json(
        { error: 'Cannot archive concept with active client review links' },
        { status: 409 }
      );
    }

    // 🔒 EDGE CASE 2: Block archiving if the concept is linked to an ACTIVE task or milestone
    const isTaskActive = concept.task && 
      concept.task.status !== 'COMPLETED' && 
      concept.task.status !== 'CANCELLED';
    
    const isMilestoneActive = concept.milestone && 
      concept.milestone.status !== 'COMPLETED' && 
      concept.milestone.status !== 'CANCELLED';

    if (isTaskActive || isMilestoneActive) {
      return NextResponse.json(
        { error: 'Cannot archive concept while it is linked to an active task or milestone' },
        { status: 409 }
      );
    }

    // 6. Soft-delete assets and archive the concept atomically (Prevents orphans)
    await prisma.$transaction([
      // Soft-delete all assets under this concept
      prisma.creativeAsset.updateMany({
        where: { conceptId: concept.id },
        data: { 
          deletedAt: new Date(),
          syncStatus: 'ARCHIVED', // Update status to match soft-delete
        },
      }),
      // Archive the concept
      prisma.concept.update({
        where: { id: concept.id },
        data: { 
          status: 'ARCHIVED', 
          deletedAt: new Date() 
        },
      }),
    ]);

    // 7. Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Concept and all associated assets archived successfully',
      archivedAssetCount: concept.assets.length,
    });

  } catch (error) {
    console.error('Error archiving concept:', error);
    return NextResponse.json(
      { error: 'Failed to archive concept' },
      { status: 500 }
    );
  }
}