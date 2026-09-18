// app/api/projects/[projectId]/creative-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { projectId } = await params;
    const url = new URL(req.url);
    const unattached = url.searchParams.get('unattached') === 'true';
    const searchQuery = url.searchParams.get('search') || '';

    // First, verify the project belongs to the agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build the where clause
    const where: any = {
      agencyId: agencyId,
      deletedAt: null,
      concept: {
        projectId: projectId,
      },
    };

    // If unattached, only fetch assets without a task
    if (unattached) {
      where.taskId = null;
    }

    // Search filter
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Fetch assets
    const assets = await prisma.creativeAsset.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
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
      take: 100,
    });

    // Transform response - convert BigInt to Number
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
        milestoneName: asset.milestone?.name || null,
        clientAccessible: asset.clientAccessible,
        clientAccessUrl: asset.clientAccessUrl,
        isSynced: asset.isSynced,
        syncStatus: asset.syncStatus,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        tags: asset.tags,
        versions: asset.versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          status: v.status,
          fileUrl: v.fileUrl,
          // ✅ Convert BigInt to Number
          fileSize: v.fileSize ? Number(v.fileSize) : null,
          mimeType: v.mimeType,
          duration: v.duration,
          resolution: v.resolution,
          feedback: v.feedback,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          versionNo: latestVersion.versionNo,
          status: latestVersion.status,
          fileUrl: latestVersion.fileUrl,
          // ✅ Convert BigInt to Number
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
    console.error('Error fetching project creative assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative assets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}