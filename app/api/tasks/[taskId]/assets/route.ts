// app/api/tasks/[taskId]/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// ─── GET Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/tasks/[taskId]/assets
 * 
 * List all creative assets attached to a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { taskId } = await params;

    // ─── 1. Verify task exists and belongs to agency ─────────────────────
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── 2. Fetch all creative assets attached to this task ──────────────
    const assets = await prisma.creativeAsset.findMany({
      where: {
        taskId: taskId,
        agencyId: agencyId,
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
    });

    // ─── 3. Transform response - convert BigInt to Number ────────────────
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
        milestoneId: asset.milestoneId,
        milestoneName: asset.milestone?.name || null,
        taskId: asset.taskId,
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
          localFileUrl: v.localFileUrl,
          cloudFileUrl: v.cloudFileUrl,
          // ✅ Convert BigInt to Number
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

    // ─── 4. Log access ────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'VIEW',
        entityType: 'Task',
        entityId: taskId,
        message: `Assets viewed for task: ${task.title || task.id}`,
        metadata: {
          assetCount: transformedAssets.length,
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json(transformedAssets);

  } catch (error) {
    console.error('Error fetching task assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task assets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

/**
 * POST /api/tasks/[taskId]/assets
 * 
 * Attach an existing asset to a task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { taskId } = await params;
    const body = await req.json();
    const { assetId, productionStage, productionMetadata } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // ─── 1. Verify task exists ────────────────────────────────────────────
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        milestoneId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── 2. Verify asset exists and belongs to agency ────────────────────
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        },
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─── 3. Verify asset belongs to the same project ─────────────────────
    if (asset.concept?.projectId !== task.projectId) {
      return NextResponse.json(
        { 
          error: 'Asset does not belong to the same project',
          assetProjectId: asset.concept?.projectId,
          taskProjectId: task.projectId,
        },
        { status: 400 }
      );
    }

    // ─── 4. Check if asset is already attached to a task ─────────────────
    if (asset.taskId) {
      // Check if it's attached to the current task (idempotent)
      if (asset.taskId === taskId) {
        return NextResponse.json({
          success: true,
          message: 'Asset already attached to this task',
          asset: {
            id: asset.id,
            name: asset.name,
            taskId: asset.taskId,
          },
        });
      }

      // Get the current task name for better error message
      const currentTask = await prisma.task.findFirst({
        where: {
          id: asset.taskId,
          agencyId: agencyId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
        },
      });

      return NextResponse.json(
        { 
          error: 'Asset is already attached to another task',
          currentTaskId: asset.taskId,
          currentTaskTitle: currentTask?.title || 'Unknown Task',
        },
        { status: 409 } // Conflict
      );
    }

    // ─── 5. Verify milestone compatibility ────────────────────────────────
    if (task.milestoneId && asset.milestoneId && asset.milestoneId !== task.milestoneId) {
      // Check if asset is attached to a different milestone
      const currentMilestone = await prisma.milestone.findFirst({
        where: {
          id: asset.milestoneId,
          agencyId: agencyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return NextResponse.json(
        {
          error: 'Asset is attached to a different milestone',
          currentMilestoneId: asset.milestoneId,
          currentMilestoneName: currentMilestone?.name || 'Unknown Milestone',
          targetMilestoneId: task.milestoneId,
        },
        { status: 409 }
      );
    }

    // ─── 6. Update asset ──────────────────────────────────────────────────
    const updateData: any = {
      taskId: taskId,
      milestoneId: task.milestoneId || null,
    };

    // Update production stage if provided
    if (productionStage) {
      updateData.productionStage = productionStage;
    }

    // Update production metadata if provided
    if (productionMetadata) {
      updateData.productionMetadata = productionMetadata;
    }

    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: updateData,
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
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ─── 7. Create notification ───────────────────────────────────────────
    // Find users assigned to this task
    const taskAssignees = await prisma.user.findMany({
      where: {
        tasks: {
          some: {
            id: taskId,
          },
        },
        agencyId: agencyId,
      },
      select: {
        id: true,
      },
    });

    // Create notifications for assignees
    if (taskAssignees.length > 0) {
      await Promise.all(
        taskAssignees.map((assignee) =>
          prisma.notification.create({
            data: {
              title: 'Asset Attached to Task',
              message: `Asset "${updatedAsset.name}" has been attached to task "${task.title || task.id}"`,
              type: 'ASSIGNMENT',
              actionUrl: `/dashboard/tasks/${taskId}`,
              userId: assignee.id,
              agencyId: agencyId,
            },
          })
        )
      );
    }

    // ─── 8. Log the attachment ────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Asset "${updatedAsset.name}" attached to task "${task.title || task.id}"`,
        metadata: {
          taskId: taskId,
          taskTitle: task.title,
          milestoneId: task.milestoneId,
          productionStage: productionStage || null,
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    // ─── 9. Transform response ────────────────────────────────────────────
    const latestVersion = updatedAsset.versions[0] || null;

    return NextResponse.json({
      success: true,
      message: 'Asset attached to task successfully',
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        description: updatedAsset.description,
        type: updatedAsset.type,
        productionStage: updatedAsset.productionStage,
        productionMetadata: updatedAsset.productionMetadata,
        conceptId: updatedAsset.conceptId,
        conceptName: updatedAsset.concept?.name || null,
        milestoneId: updatedAsset.milestoneId,
        milestoneName: updatedAsset.milestone?.name || null,
        taskId: updatedAsset.taskId,
        clientAccessible: updatedAsset.clientAccessible,
        clientAccessUrl: updatedAsset.clientAccessUrl,
        isSynced: updatedAsset.isSynced,
        syncStatus: updatedAsset.syncStatus,
        createdAt: updatedAsset.createdAt,
        updatedAt: updatedAsset.updatedAt,
        tags: updatedAsset.tags,
        versions: updatedAsset.versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          status: v.status,
          fileUrl: v.fileUrl,
          fileSize: v.fileSize ? Number(v.fileSize) : null,
          mimeType: v.mimeType,
          duration: v.duration,
          resolution: v.resolution,
          createdAt: v.createdAt,
        })),
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
      },
    });

  } catch (error) {
    console.error('Error attaching asset to task:', error);
    return NextResponse.json(
      { error: 'Failed to attach asset to task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── DELETE Handler ─────────────────────────────────────────────────────────

/**
 * DELETE /api/tasks/[taskId]/assets
 * 
 * Detach an asset from a task
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { taskId } = await params;
    const url = new URL(req.url);
    const assetId = url.searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // ─── 1. Verify task exists ────────────────────────────────────────────
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── 2. Verify asset exists and is attached to this task ─────────────
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        taskId: taskId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or not attached to this task' },
        { status: 404 }
      );
    }

    // ─── 3. Detach asset ──────────────────────────────────────────────────
    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        taskId: null,
      },
    });

    // ─── 4. Log the detachment ────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Asset "${asset.name}" detached from task "${task.title || task.id}"`,
        metadata: {
          taskId: taskId,
          taskTitle: task.title,
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset detached from task successfully',
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        taskId: updatedAsset.taskId,
      },
    });

  } catch (error) {
    console.error('Error detaching asset from task:', error);
    return NextResponse.json(
      { error: 'Failed to detach asset from task: ' + (error as Error).message },
      { status: 500 }
    );
  }
}