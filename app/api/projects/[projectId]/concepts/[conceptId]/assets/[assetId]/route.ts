import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: Fetch a single asset with all versions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

// PATCH: Update asset details (name, type)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;
    const body = await req.json();
    const { name, type } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        concept: {
          select: { name: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const updatedAsset = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        name: name || undefined,
        type: type as any || undefined,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Updated asset "${asset.name}" for concept "${asset.concept.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an asset and all its versions
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        versions: true,
        concept: {
          select: { name: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete the asset (cascade will delete versions)
    await prisma.creativeAsset.delete({
      where: { id: assetId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CreativeAsset',
        entityId: assetId,
        message: `Deleted asset "${asset.name}" from concept "${asset.concept.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}