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

    // Validate required params
    if (!projectId || !conceptId || !assetId || !versionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, feedback } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify version exists and belongs to the asset
    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: user.agencyId,
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

    // Validate status
    const validStatuses = ['DRAFT', 'CLIENT_REVIEW', 'INTERNAL_REVIEW', 'APPROVED', 'REJECTED', 'REVISIONS_REQUIRED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Role-based validation
    const userRole = user.role || 'CREATIVE';

    // Only TEAMLEADER/ADMIN can approve or reject
    if ((status === 'APPROVED' || status === 'REJECTED') && 
        !['ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only Team Leaders and Admins can approve or reject versions' },
        { status: 403 }
      );
    }

    // Allow CREATIVE to set REVISIONS_REQUIRED (from feedback)
    if (status === 'REVISIONS_REQUIRED' && 
        !['CREATIVE', 'ADMIN', 'SUPERADMIN', 'TEAMLEADER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only Creatives, Team Leaders, and Admins can request revisions' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (status === 'APPROVED' || status === 'REJECTED' || status === 'REVISIONS_REQUIRED') {
      updateData.reviewedBy = {
        connect: { id: session.user.id }
      };
    }

    const updatedVersion = await prisma.creativeAssetVersion.update({
      where: { id: versionId },
      data: updateData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAssetVersion',
        entityId: versionId,
        message: `Updated version ${version.versionNo} of asset "${version.creativeAsset.name}" to ${status || 'updated'}`,
        agencyId: user.agencyId,
        actorId: session.user.id,
        metadata: { 
          changes: { 
            status: status || undefined, 
            feedback: feedback || undefined,
            versionNo: version.versionNo,
            assetName: version.creativeAsset.name,
          } 
        },
      },
    });

    return NextResponse.json(updatedVersion);
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Failed to update version: ' + (error instanceof Error ? error.message : 'Unknown error') },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        creativeAssetId: assetId,
        agencyId: user.agencyId,
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
        agencyId: user.agencyId,
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

// OPTIONS: Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'PATCH, DELETE, OPTIONS',
    },
  });
}