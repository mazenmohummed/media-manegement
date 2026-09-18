// app/api/milestones/[milestoneId]/creative-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { milestoneId } = await params;

    // ─── Verify milestone exists and belongs to agency ─────────────────────
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

    // ─── Fetch all creative assets linked to this milestone ──────────────
    const assets = await prisma.creativeAsset.findMany({
      where: {
        milestoneId: milestoneId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // ─── Transform response ────────────────────────────────────────────────
    const transformedAssets = assets.map((asset) => {
      const latestVersion = asset.versions[0] || null;
      
      return {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        type: asset.type,
        productionStage: asset.productionStage,
        productionMetadata: asset.productionMetadata,
        conceptId: asset.conceptId,
        conceptName: asset.concept?.name || null,
        taskId: asset.taskId,
        taskTitle: asset.task?.title || null,
        milestoneId: asset.milestoneId,
        clientAccessible: asset.clientAccessible,
        clientAccessUrl: asset.clientAccessUrl,
        isSynced: asset.isSynced,
        syncStatus: asset.syncStatus,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        tags: asset.tags,
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          versionNo: latestVersion.versionNo,
          status: latestVersion.status,
          fileUrl: latestVersion.fileUrl,
          fileSize: latestVersion.fileSize ? Number(latestVersion.fileSize) : null,
          mimeType: latestVersion.mimeType,
          duration: latestVersion.duration,
          resolution: latestVersion.resolution,
          thumbnailUrl: latestVersion.thumbnailUrl,
          createdAt: latestVersion.createdAt,
        } : null,
      };
    });

    return NextResponse.json(transformedAssets);

  } catch (error) {
    console.error('Error fetching milestone creative assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative assets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}