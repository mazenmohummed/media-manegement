// app/api/creative-assets/[assetId]/compare/route.ts
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
    const url = new URL(req.url);
    const versionA = parseInt(url.searchParams.get('versionA') || '1');
    const versionB = parseInt(url.searchParams.get('versionB') || '2');

    // Verify asset exists
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
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
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Fetch the two versions
    const versions = await prisma.creativeAssetVersion.findMany({
      where: {
        creativeAssetId: assetId,
        versionNo: { in: [versionA, versionB] },
      },
      orderBy: { versionNo: 'asc' },
    });

    if (versions.length !== 2) {
      return NextResponse.json(
        { error: 'Two versions are required for comparison' },
        { status: 400 }
      );
    }

    const [vA, vB] = versions;

    // Calculate differences
    const differences = {
      fileSize: vA.fileSize !== vB.fileSize,
      resolution: vA.resolution !== vB.resolution,
      duration: vA.duration !== vB.duration,
      mimeType: vA.mimeType !== vB.mimeType,
      status: vA.status !== vB.status,
      feedback: vA.feedback !== vB.feedback,
    };

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        concept: asset.concept,
      },
      versionA: {
        id: vA.id,
        versionNo: vA.versionNo,
        status: vA.status,
        fileUrl: vA.fileUrl,
        fileSize: vA.fileSize,
        resolution: vA.resolution,
        duration: vA.duration,
        mimeType: vA.mimeType,
        feedback: vA.feedback,
        createdAt: vA.createdAt,
      },
      versionB: {
        id: vB.id,
        versionNo: vB.versionNo,
        status: vB.status,
        fileUrl: vB.fileUrl,
        fileSize: vB.fileSize,
        resolution: vB.resolution,
        duration: vB.duration,
        mimeType: vB.mimeType,
        feedback: vB.feedback,
        createdAt: vB.createdAt,
      },
      differences,
    });

  } catch (error) {
    console.error('Error comparing versions:', error);
    return NextResponse.json(
      { error: 'Failed to compare versions' },
      { status: 500 }
    );
  }
}