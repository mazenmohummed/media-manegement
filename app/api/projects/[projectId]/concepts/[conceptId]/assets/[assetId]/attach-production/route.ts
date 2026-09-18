// app/api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/attach-production/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// Define the valid production stages
const VALID_PRODUCTION_STAGES = [
  'pre-production',
  'shooting',
  'editing',
  'color_grading',
  'sound_design',
  'motion_graphics',
  'vfx',
  'final_delivery',
] as const;

type ProductionStage = typeof VALID_PRODUCTION_STAGES[number];

/**
 * PATCH /api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/attach-production
 * 
 * Attach production metadata, task/milestone associations, and tags to a creative asset.
 * This enables full traceability from concept → asset → production task/milestone.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;
    const body = await req.json();
    const {
      taskId,
      milestoneId,
      productionStage,
      productionMetadata,
      tags,
      clientAccessible,
    } = body;

    // 1. Verify asset exists and belongs to agency/project
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId: conceptId,
        agencyId: session.user.agencyId,
        concept: { projectId: projectId },
      },
      include: {
        tags: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 2. Verify task exists if provided
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId: projectId,
          agencyId: session.user.agencyId,
          deletedAt: null,
        },
      });
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found or not part of this project' },
          { status: 404 }
        );
      }
    }

    // 3. Verify milestone exists if provided
    if (milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: {
          id: milestoneId,
          projectId: projectId,
          agencyId: session.user.agencyId,
          deletedAt: null,
        },
      });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found or not part of this project' },
          { status: 404 }
        );
      }
    }

    // 4. Validate production stage if provided
    if (productionStage && !VALID_PRODUCTION_STAGES.includes(productionStage as ProductionStage)) {
      return NextResponse.json(
        {
          error: `Invalid production stage. Must be one of: ${VALID_PRODUCTION_STAGES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 5. Handle tags (create or find existing)
    let tagConnections: { id: string }[] = [];
    const agencyId = session.user.agencyId as string;
    
    if (tags && Array.isArray(tags) && tags.length > 0) {
      tagConnections = await Promise.all(
        tags.map(async (tagName: string) => {
          // Find existing tag or create new one
          let tag = await prisma.tag.findFirst({
            where: {
              name: { equals: tagName, mode: 'insensitive' },
              agencyId: agencyId,
            },
          });
          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: tagName,
                agencyId: agencyId,
              },
            });
          }
          return { id: tag.id };
        })
      );
    }

    // 6. Build update data
    const updateData: any = {
      taskId: taskId || null,
      milestoneId: milestoneId || null,
      productionStage: productionStage || null,
      productionMetadata: productionMetadata || undefined,
      clientAccessible: clientAccessible !== undefined ? clientAccessible : asset.clientAccessible,
    };

    // 7. Handle tag connections (disconnect old, connect new)
    if (tagConnections.length > 0) {
      // Disconnect all existing tags
      if (asset.tags && asset.tags.length > 0) {
        updateData.tags = {
          disconnect: asset.tags.map((t: any) => ({ id: t.id })),
          connect: tagConnections,
        };
      } else {
        updateData.tags = {
          connect: tagConnections,
        };
      }
    } else if (asset.tags && asset.tags.length > 0) {
      // Remove all tags if none provided
      updateData.tags = {
        disconnect: asset.tags.map((t: any) => ({ id: t.id })),
      };
    }

    // 8. If clientAccessible is true, generate a client access URL
    if (clientAccessible === true) {
      // Generate a secure token for client access
      const token = Buffer.from(`${assetId}-${Date.now()}`).toString('base64url');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      updateData.clientAccessUrl = `${baseUrl}/client-assets/${token}`;
    }

    // 9. Update the asset
    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        tags: true,
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
      },
    });

    // 10. Log the production attachment
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Production metadata attached to asset: ${updatedAsset.name}`,
        metadata: {
          productionStage: productionStage,
          taskId: taskId,
          milestoneId: milestoneId,
          tags: tags || [],
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: 'Production metadata attached successfully',
    });
  } catch (error) {
    console.error('Error attaching production data:', error);
    return NextResponse.json(
      { error: 'Failed to attach production data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/attach-production
 * 
 * Get production metadata for an asset
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId: conceptId,
        agencyId: session.user.agencyId,
        concept: { projectId: projectId },
      },
      include: {
        tags: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            priority: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true,
          },
        },
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 5,
          select: {
            id: true,
            versionNo: true,
            status: true,
            fileSize: true,
            mimeType: true,
            duration: true,
            resolution: true,
            createdAt: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        productionMetadata: asset.productionMetadata || {},
      },
    });
  } catch (error) {
    console.error('Error fetching production metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production metadata' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/attach-production
 * 
 * Remove production metadata from an asset (detach from task/milestone)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;

    // Verify asset exists
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId: conceptId,
        agencyId: session.user.agencyId,
        concept: { projectId: projectId },
      },
      include: {
        tags: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Remove production metadata
    const updateData: any = {
      taskId: null,
      milestoneId: null,
      productionStage: null,
      productionMetadata: null,
      clientAccessible: false,
      clientAccessUrl: null,
    };

    // Also disconnect all tags
    if (asset.tags && asset.tags.length > 0) {
      updateData.tags = {
        disconnect: asset.tags.map((t: any) => ({ id: t.id })),
      };
    }

    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: 'Production metadata removed successfully',
    });
  } catch (error) {
    console.error('Error removing production metadata:', error);
    return NextResponse.json(
      { error: 'Failed to remove production metadata' },
      { status: 500 }
    );
  }
}