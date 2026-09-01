import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// GET: Compare two versions of an asset
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
    const url = new URL(req.url);
    const versionA = url.searchParams.get('versionA');
    const versionB = url.searchParams.get('versionB');

    if (!versionA || !versionB) {
      return NextResponse.json(
        { error: 'Both versionA and versionB parameters are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Get the asset with both versions
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        versions: {
          where: {
            versionNo: {
              in: [parseInt(versionA), parseInt(versionB)],
            },
          },
          include: {
            reviewedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { versionNo: 'asc' },
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

    if (asset.versions.length !== 2) {
      return NextResponse.json(
        { error: 'Both versions must exist' },
        { status: 404 }
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching versions for comparison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}