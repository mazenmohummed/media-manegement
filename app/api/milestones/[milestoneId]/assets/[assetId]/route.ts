// app/api/milestones/[milestoneId]/assets/[assetId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { milestoneId, assetId } = await params;
    const body = await req.json();
    const { link } = body;

    // ─── Verify milestone exists ──────────────────────────────────────────
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // ─── Verify asset exists and belongs to the same project ──────────────
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        concept: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─── Verify asset belongs to the same project ─────────────────────────
    if (asset.concept?.projectId !== milestone.projectId) {
      return NextResponse.json(
        { error: 'Asset does not belong to the same project' },
        { status: 400 }
      );
    }

    // ─── Link or Unlink ────────────────────────────────────────────────────
    const updateData: any = {};

    if (link) {
      updateData.milestoneId = milestoneId;
    } else {
      updateData.milestoneId = null;
    }

    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: updateData,
    });

    // ─── Log the action ────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: link 
          ? `Asset "${updatedAsset.name}" linked to milestone "${milestoneId}"`
          : `Asset "${updatedAsset.name}" unlinked from milestone "${milestoneId}"`,
        metadata: {
          milestoneId,
          assetId,
          action: link ? 'link' : 'unlink',
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      message: link ? 'Asset linked to milestone' : 'Asset unlinked from milestone',
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        milestoneId: updatedAsset.milestoneId,
      },
    });

  } catch (error) {
    console.error('Error linking asset to milestone:', error);
    return NextResponse.json(
      { error: 'Failed to link asset to milestone: ' + (error as Error).message },
      { status: 500 }
    );
  }
}