import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// PATCH: Update version status or feedback
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId, versionId } = await params;
    const body = await req.json();
    const { status, feedback } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true },
    });

    // Verify version exists and belongs to the asset
    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: user?.agencyId,
      },
      include: {
        creativeAsset: {
          include: {
            concept: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Only allow status changes for certain roles
    const validStatuses = ['DRAFT', 'CLIENT_REVIEW', 'INTERNAL_REVIEW', 'APPROVED', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Only TEAMLEADER/ADMIN can approve or reject
    if ((status === 'APPROVED' || status === 'REJECTED') && 
        !['ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(user?.role || '')) {
      return NextResponse.json(
        { error: 'Only Team Leaders and Admins can approve or reject versions' },
        { status: 403 }
      );
    }

    const updatedVersion = await prisma.creativeAssetVersion.update({
      where: { id: versionId },
      data: {
        status: status as any || undefined,
        feedback: feedback !== undefined ? feedback : undefined,
        reviewedBy: session.user.id ? {
          connect: { id: session.user.id }
        } : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAssetVersion',
        entityId: versionId,
        message: `Updated version ${version.versionNo} of asset "${version.creativeAsset.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
        metadata: { changes: { status, feedback } },
      },
    });

    return NextResponse.json(updatedVersion);
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific version
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId, versionId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: user?.agencyId,
      },
      include: {
        creativeAsset: {
          include: {
            concept: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Don't allow deleting the only version
    const versionCount = await prisma.creativeAssetVersion.count({
      where: { creativeAssetId: assetId },
    });

    if (versionCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only version of an asset. Delete the asset instead.' },
        { status: 400 }
      );
    }

    await prisma.creativeAssetVersion.delete({
      where: { id: versionId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeAssetVersion',
        entityId: versionId,
        message: `Deleted version ${version.versionNo} of asset "${version.creativeAsset.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}