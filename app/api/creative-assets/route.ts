// app/api/creative-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const stage = url.searchParams.get('stage') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // ─── New parameters ──────────────────────────────────────────────────────
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    const unattached = url.searchParams.get('unattached') === 'true';
    const projectId = url.searchParams.get('projectId');
    const excludeTaskId = url.searchParams.get('excludeTaskId');
    const includeAssetIds = url.searchParams.get('includeAssetIds')?.split(',').filter(Boolean);

    // ─── Build where clause ─────────────────────────────────────────────────
    const where: any = {
      agencyId: session.user.agencyId,
    };

    // Only filter by deletedAt if not including deleted
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // If unattached, only fetch assets without a task
    if (unattached) {
      where.taskId = null;
    }

    // If projectId is provided, filter by project via concept
    if (projectId) {
      where.concept = {
        projectId: projectId,
      };
    }

    // If excludeTaskId is provided, exclude assets attached to this task
    if (excludeTaskId) {
      where.OR = [
        { taskId: null },
        { taskId: { not: excludeTaskId } },
      ];
    }

    // If includeAssetIds is provided, only fetch specific assets
    if (includeAssetIds && includeAssetIds.length > 0) {
      where.id = {
        in: includeAssetIds,
      };
    }

    // Search filter
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { concept: { name: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }

    // Type filter
    if (type !== 'all') {
      where.type = type;
    }

    // Stage filter
    if (stage !== 'all') {
      where.productionStage = stage;
    }

    // Status filter (via latest version)
    if (status !== 'all') {
      where.versions = {
        some: {
          status: status,
        },
      };
    }

    // ─── Fetch assets with their latest version ─────────────────────────────
    const [assets, total] = await Promise.all([
      prisma.creativeAsset.findMany({
        where,
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
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creativeAsset.count({ where }),
    ]);

    // ─── Transform response ─────────────────────────────────────────────────
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
        conceptProjectId: asset.concept?.projectId || null,
        taskId: asset.taskId,
        taskTitle: asset.task?.title || null,
        taskStatus: asset.task?.status || null,
        milestoneId: asset.milestoneId,
        milestoneName: asset.milestone?.name || null,
        milestoneStatus: asset.milestone?.status || null,
        clientAccessible: asset.clientAccessible,
        clientAccessUrl: asset.clientAccessUrl,
        isDeleted: asset.deletedAt !== null,
        deletedAt: asset.deletedAt,
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
          localFileUrl: v.localFileUrl,
          cloudFileUrl: v.cloudFileUrl,
          fileSize: v.fileSize ? Number(v.fileSize) : null,
          mimeType: v.mimeType,
          duration: v.duration,
          resolution: v.resolution,
          frameRate: v.frameRate,
          bitrate: v.bitrate,
          codec: v.codec,
          audioChannels: v.audioChannels,
          feedback: v.feedback,
          processingStatus: v.processingStatus,
          thumbnailUrl: v.thumbnailUrl,
          primaryStorage: v.primaryStorage,
          isSyncedToCloud: v.isSyncedToCloud,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          reviewedBy: v.reviewedBy ? {
            id: v.reviewedBy.id,
            name: v.reviewedBy.name,
            email: v.reviewedBy.email,
            role: v.reviewedBy.role,
          } : null,
        })),
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          versionNo: latestVersion.versionNo,
          status: latestVersion.status,
          fileUrl: latestVersion.fileUrl,
          localFileUrl: latestVersion.localFileUrl,
          cloudFileUrl: latestVersion.cloudFileUrl,
          fileSize: latestVersion.fileSize ? Number(latestVersion.fileSize) : null,
          mimeType: latestVersion.mimeType,
          duration: latestVersion.duration,
          resolution: latestVersion.resolution,
          thumbnailUrl: latestVersion.thumbnailUrl,
          primaryStorage: latestVersion.primaryStorage,
          isSyncedToCloud: latestVersion.isSyncedToCloud,
          createdAt: latestVersion.createdAt,
        } : null,
      };
    });

    return NextResponse.json({
      assets: transformedAssets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        includeDeleted,
        unattached,
        projectId: projectId || null,
      },
    });

  } catch (error) {
    console.error('Error fetching creative assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative assets' },
      { status: 500 }
    );
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, 
      description, 
      type, 
      productionStage, 
      conceptId, 
      clientAccessible 
    } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });
    }
    if (!conceptId) {
      return NextResponse.json({ error: 'Concept ID is required' }, { status: 400 });
    }

    // Verify concept exists, belongs to agency, and is not deleted
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: { 
        id: true, 
        projectId: true,
        name: true,
      },
    });

    if (!concept) {
      return NextResponse.json({ 
        error: 'Concept not found or has been deleted' 
      }, { status: 404 });
    }

    // ─── Auto-generate unique name if duplicate exists ────────────────────
    let finalName = name.trim();
    let wasRenamed = false;
    
    // Find all assets with the same base name in this concept
    const existingAssets = await prisma.creativeAsset.findMany({
      where: {
        name: {
          startsWith: name.trim(),
        },
        conceptId: conceptId,
        deletedAt: null,
        agencyId: session.user.agencyId,
      },
      select: {
        name: true,
      },
      orderBy: {
        name: 'desc',
      },
    });

    // Check if an exact match exists
    const exactMatch = existingAssets.some(a => a.name === name.trim());

    if (exactMatch) {
      wasRenamed = true;
      // Find the highest number used
      let highestNumber = 0;
      const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePattern = new RegExp(`^${escapedName}(?:\\s*\\((\\d+)\\))?$`);
      
      for (const asset of existingAssets) {
        const match = asset.name.match(namePattern);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (num > highestNumber) {
            highestNumber = num;
          }
        } else if (asset.name === name.trim()) {
          highestNumber = Math.max(highestNumber, 1);
        }
      }

      // Generate new name with incremented number
      if (highestNumber >= 1) {
        finalName = `${name.trim()} (${highestNumber + 1})`;
      } else {
        finalName = `${name.trim()} (2)`;
      }
    }

    // Create the asset with the final name
    const asset = await prisma.creativeAsset.create({
      data: {
        name: finalName,
        description: description || null,
        type: type,
        productionStage: productionStage || null,
        conceptId: conceptId,
        agencyId: session.user.agencyId,
        clientAccessible: clientAccessible || false,
        isSynced: false,
        syncStatus: 'NOT_SYNCED',
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        },
        tags: true,
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'CreativeAsset',
        entityId: asset.id,
        message: `Creative asset created: ${asset.name}${wasRenamed ? ` (was: ${name.trim()})` : ''}`,
        metadata: {
          assetId: asset.id,
          name: asset.name,
          originalName: name.trim(),
          wasRenamed: wasRenamed,
          type: asset.type,
          conceptId: asset.conceptId,
          conceptName: asset.concept?.name,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      id: asset.id,
      name: asset.name,
      originalName: name.trim(),
      wasRenamed: wasRenamed,
      type: asset.type,
      conceptId: asset.conceptId,
      conceptName: asset.concept?.name,
      projectId: asset.concept?.projectId,
      clientAccessible: asset.clientAccessible,
      createdAt: asset.createdAt,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating creative asset:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'An asset with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create creative asset' },
      { status: 500 }
    );
  }
}

// ─── DELETE Handler (Soft Delete) ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const assetId = url.searchParams.get('id');

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    // Verify asset exists and belongs to agency
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Soft delete the asset
    const deletedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: { deletedAt: new Date() },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Creative asset soft deleted: ${asset.name}`,
        metadata: {
          assetId: asset.id,
          name: asset.name,
          type: asset.type,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
      id: deletedAsset.id,
      deletedAt: deletedAsset.deletedAt,
    });

  } catch (error) {
    console.error('Error deleting creative asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete creative asset' },
      { status: 500 }
    );
  }
}

// ─── PATCH Handler (Restore Soft Deleted) ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const assetId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    // Verify asset exists and belongs to agency
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Restore soft deleted asset
    if (action === 'restore') {
      const restoredAsset = await prisma.creativeAsset.update({
        where: { id: assetId },
        data: { deletedAt: null },
      });

      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'CreativeAsset',
          entityId: assetId,
          message: `Creative asset restored: ${asset.name}`,
          metadata: {
            assetId: asset.id,
            name: asset.name,
          },
          agencyId: session.user.agencyId,
          actorId: session.user.id || 'system',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Asset restored successfully',
        id: restoredAsset.id,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=restore' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating creative asset:', error);
    return NextResponse.json(
      { error: 'Failed to update creative asset' },
      { status: 500 }
    );
  }
}