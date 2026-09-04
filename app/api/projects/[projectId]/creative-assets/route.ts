// app/api/projects/[projectId]/creative-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;

    const assets = await prisma.creativeAsset.findMany({
      where: {
        concept: {
          projectId: projectId,
          agencyId: session.user.agencyId,
        },
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
        reviewLinkAssetApprovals: {
          include: {
            reviewLink: {
              select: {
                id: true,
                token: true,
                status: true,
                reviewedAt: true,
                client: {
                  select: {
                    clientName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for frontend
    const transformedAssets = assets.map((asset: any) => ({
      ...asset,
      latestVersion: asset.versions[0] || null,
      reviewLinkAssetApprovals: asset.reviewLinkAssetApprovals.map((approval: any) => ({
        ...approval,
        reviewLink: approval.reviewLink,
      })),
    }));

    return NextResponse.json(transformedAssets);

  } catch (error) {
    console.error('Error fetching creative assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative assets' },
      { status: 500 }
    );
  }
}