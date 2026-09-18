// app/api/creative-assets/[assetId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId } = await params;

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          include: {
            reviewedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            status: true,
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
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Transform response - convert BigInt to Number
    const transformedAsset = {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      type: asset.type,
      productionStage: asset.productionStage,
      productionMetadata: asset.productionMetadata,
      conceptId: asset.conceptId,
      conceptName: asset.concept?.name || null,
      conceptProjectId: asset.concept?.projectId || null,
      taskId: asset.taskId,
      taskTitle: asset.task?.title || null,
      taskStatus: asset.task?.status || null,
      milestoneId: asset.milestoneId,
      milestoneName: asset.milestone?.name || null,
      milestoneStatus: asset.milestone?.status || null,
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
        fileUrl: v.fileUrl,
        localFileUrl: v.localFileUrl,
        cloudFileUrl: v.cloudFileUrl,
        status: v.status,
        feedback: v.feedback,
        fileSize: v.fileSize ? Number(v.fileSize) : null,
        mimeType: v.mimeType,
        duration: v.duration,
        resolution: v.resolution,
        frameRate: v.frameRate,
        bitrate: v.bitrate,
        codec: v.codec,
        audioChannels: v.audioChannels,
        processingStatus: v.processingStatus,
        thumbnailUrl: v.thumbnailUrl,
        primaryStorage: v.primaryStorage,     // ✅ added
        isSyncedToCloud: v.isSyncedToCloud,   // ✅ added
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        reviewedBy: v.reviewedBy ? {
            id: v.reviewedBy.id,
            name: v.reviewedBy.name,
            email: v.reviewedBy.email,
            role: v.reviewedBy.role,
        } : null,
        reviewedAt: v.updatedAt,
        })),
    };

    // Log access - use 'UPDATE' instead of 'VIEW' since 'VIEW' doesn't exist in AuditAction enum
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE', // Changed from 'VIEW' to 'UPDATE'
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Creative asset viewed: ${asset.name}`,
        metadata: {
          type: asset.type,
          versionCount: asset.versions.length,
          productionStage: asset.productionStage,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json(transformedAsset);

  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/creative-assets/[assetId] - Delete Asset
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId } = await params;

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        versions: {
          select: {
            id: true,
            versionNo: true,
            status: true,
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
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if asset is being used in any review links
    const reviewLinkApprovals = await prisma.reviewLinkAssetApproval.findMany({
      where: {
        assetId: assetId,
      },
      select: {
        id: true,
        reviewLink: {
          select: {
            id: true,
            token: true,
            isActive: true,
          },
        },
      },
    });

    const activeReviewLinks = reviewLinkApprovals.filter(
      (a) => a.reviewLink?.isActive === true
    );

    if (activeReviewLinks.length > 0) {
      console.warn(`Asset ${assetId} is used in ${activeReviewLinks.length} active review links`);
    }

    // Soft delete the asset
    const deletedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        deletedAt: new Date(),
        taskId: null,
        milestoneId: null,
      },
    });

    // Log deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Creative asset deleted: ${asset.name}`,
        metadata: {
          type: asset.type,
          versionCount: asset.versions.length,
          conceptId: asset.conceptId,
          conceptName: asset.concept?.name,
          taskId: asset.taskId,
          taskTitle: asset.task?.title,
          activeReviewLinks: activeReviewLinks.length,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    // Clean up any review link approvals for this asset
    if (reviewLinkApprovals.length > 0) {
      await prisma.reviewLinkAssetApproval.updateMany({
        where: {
          assetId: assetId,
        },
        data: {
          status: 'REJECTED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
      asset: {
        id: deletedAsset.id,
        name: deletedAsset.name,
        deletedAt: deletedAsset.deletedAt,
      },
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset: ' + (error as Error).message },
      { status: 500 }
    );
  }
}