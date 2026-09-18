// app/api/proxy/[agencyId]/[assetId]/[versionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClientShareService } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      agencyId: string;
      assetId: string;
      versionId: string;
    }>;
  }
) {
  try {
    // ✅ Await params before accessing (Next.js 16 requirement)
    const { agencyId, assetId, versionId } = await params;

    // ✅ Get ClientShareService with dependencies
    const clientShareService = getClientShareService();

    // ✅ Validate access (check if client has permission)
    const hasAccess = await validateAccess(versionId, agencyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized access to this file' },
        { status: 401 }
      );
    }

    // ✅ Get file from agency's local storage
    const fileBuffer = await clientShareService.proxyFile(
      agencyId,
      assetId,
      versionId
    );

    // ✅ Get file info for proper headers
    const version = await prisma.creativeAssetVersion.findUnique({
      where: { id: versionId },
      select: {
        creativeAsset: {
          select: { name: true },
        },
        versionNo: true,
      },
    });

    const fileName = version
      ? `${version.creativeAsset.name}-v${version.versionNo}`
      : `file-${versionId}`;

    // ✅ Return file with proper headers
    // Buffer → Uint8Array so the body satisfies BodyInit
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error proxying file:', error);

    if (errorMessage === 'File not found locally') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (errorMessage === 'Access denied or file not found') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ✅ Validation function
async function validateAccess(
  versionId: string,
  agencyId: string
): Promise<boolean> {
  try {
    // ✅ findFirst — because { id, agencyId } is not a unique compound key
    const version = await prisma.creativeAssetVersion.findFirst({
      where: {
        id: versionId,
        agencyId: agencyId,
      },
      include: {
        creativeAsset: {
          include: {
            concept: {
              include: {
                reviewLinks: {
                  where: {
                    isActive: true,
                    expiresAt: {
                      gt: new Date(),
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!version) {
      return false;
    }

    // ✅ If the file is in cloud, check if it has a valid review link
    if (version.isSyncedToCloud) {
      const hasActiveReviewLink =
        version.creativeAsset.concept.reviewLinks.length > 0;
      if (hasActiveReviewLink) {
        return true;
      }
    }

    // ✅ Check if the file is approved or under client review
    const isClientAccessible = ['APPROVED', 'CLIENT_REVIEW'].includes(
      version.status
    );

    if (isClientAccessible) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating access:', error);
    return false;
  }
}