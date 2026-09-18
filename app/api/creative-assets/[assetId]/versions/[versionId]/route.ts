// app/api/creative-assets/[assetId]/versions/[versionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId, versionId } = await params;
    const body = await req.json();
    const { status, feedback } = body;

    // Verify asset exists with concept relation
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        concept: {
          include: {
            project: {
              select: {
                clientId: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify version exists and belongs to asset
    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: session.user.agencyId,
      },
      include: {
        creativeAsset: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Update version
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    // If status is APPROVED, REJECTED, or REVISIONS_REQUIRED, set reviewed info
    if (status === 'APPROVED' || status === 'REJECTED' || status === 'REVISIONS_REQUIRED') {
      updateData.updatedAt = new Date();
      if (session.user.id) {
        updateData.reviewedById = session.user.id;
      }
    }

    const updatedVersion = await prisma.creativeAssetVersion.update({
      where: { id: versionId },
      data: updateData,
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
    });

    // If approved, also update asset's sync status
    if (status === 'APPROVED') {
      await prisma.creativeAsset.update({
        where: { id: assetId },
        data: {
          isSynced: true,
          syncedAt: new Date(),
        },
      });
    }

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAssetVersion',
        entityId: versionId,
        message: `Version v${version.versionNo} status updated to ${status}`,
        metadata: {
          assetId: assetId,
          versionNo: version.versionNo,
          oldStatus: version.status,
          newStatus: status,
          feedback: feedback || null,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    // If feedback was provided, create a notification for assignees
    if (feedback && status === 'REVISIONS_REQUIRED') {
      // Find users assigned to tasks that use this asset
      const taskWithAsset = await prisma.task.findFirst({
        where: {
          creativeAssets: {
            some: {
              id: assetId,
            },
          },
          agencyId: session.user.agencyId,
        },
        include: {
          assignees: {
            select: {
              id: true,
            },
          },
        },
      });

      if (taskWithAsset && taskWithAsset.assignees.length > 0) {
        // Get the agencyId as a non-nullable string
        const agencyId = session.user.agencyId; // This is already string due to the check above
        
        await Promise.all(
          taskWithAsset.assignees.map((assignee) =>
            prisma.notification.create({
              data: {
                title: 'Revisions Requested',
                message: `Revisions requested for "${asset.name}" v${version.versionNo}: ${feedback.substring(0, 100)}${feedback.length > 100 ? '...' : ''}`,
                type: 'ALERT',
                actionUrl: `/dashboard/creative-assets/${assetId}`,
                userId: assignee.id,
                agencyId: agencyId, // Use the non-nullable variable
              },
            })
          )
        );
      }
    }

    // If approved, notify the client if the asset is client accessible
    if (status === 'APPROVED' && asset.clientAccessible) {
      // Use the properly typed concept relation
      const clientId = asset.concept?.project?.clientId;
      if (clientId) {
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: { email: true, clientName: true },
        });

        if (client?.email) {
          // Send email notification (you'd implement this with your email service)
          // await sendClientApprovalEmail(client.email, client.clientName, asset.name, version.versionNo);
          console.log(`Client approval notification would be sent to ${client.email}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      version: {
        id: updatedVersion.id,
        versionNo: updatedVersion.versionNo,
        status: updatedVersion.status,
        feedback: updatedVersion.feedback,
        reviewedBy: updatedVersion.reviewedBy,
        updatedAt: updatedVersion.updatedAt,
      },
    });

  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Failed to update version: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/creative-assets/[assetId]/versions/[versionId] - Delete Version
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId, versionId } = await params;

    // Verify version exists and belongs to asset
    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: session.user.agencyId,
      },
      include: {
        creativeAsset: true,
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get version count for this asset
    const versionCount = await prisma.creativeAssetVersion.count({
      where: {
        creativeAssetId: assetId,
      },
    });

    // Prevent deleting the last version
    if (versionCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last version of an asset' },
        { status: 400 }
      );
    }

    // Check if this is the latest version
    const latestVersion = await prisma.creativeAssetVersion.findFirst({
      where: {
        creativeAssetId: assetId,
      },
      orderBy: { versionNo: 'desc' },
    });

    const isLatest = latestVersion?.id === versionId;

    // Delete the version
    await prisma.creativeAssetVersion.delete({
      where: { id: versionId },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeAssetVersion',
        entityId: versionId,
        message: `Version v${version.versionNo} deleted from asset: ${version.creativeAsset.name}`,
        metadata: {
          assetId: assetId,
          assetName: version.creativeAsset.name,
          versionNo: version.versionNo,
          status: version.status,
          isLatest: isLatest,
          remainingVersions: versionCount - 1,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    // If this was the latest version, update the asset's updatedAt
    if (isLatest) {
      await prisma.creativeAsset.update({
        where: { id: assetId },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Version deleted successfully',
      remainingVersions: versionCount - 1,
    });

  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version: ' + (error as Error).message },
      { status: 500 }
    );
  }
}