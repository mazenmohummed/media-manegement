// app/api/assets/[assetId]/attach-production/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { validateAssetProductionAccess } from '@/lib/approval-gate';

export async function POST(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { assetId } = params;
    const body = await req.json();

    const { fileUrl, name, type, conceptId } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    // Verify asset exists and belongs to agency
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId,
      },
      include: {
        concept: true,
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // 🔒 APPROVAL GATE: Check if asset's concept is approved
    try {
      await validateAssetProductionAccess(assetId, 'attach production asset');
    } catch (gateError: any) {
      return NextResponse.json(
        {
          error: 'Production blocked',
          details: gateError.message,
          type: 'APPROVAL_REQUIRED',
        },
        { status: 403 }
      );
    }

    // Get next version number
    const latestVersion = asset.versions[0];
    const nextVersionNo = latestVersion ? latestVersion.versionNo + 1 : 1;

    // Create production version
    // Fix: Use 'APPROVED' status since 'PRODUCTION_READY' doesn't exist in the enum
    const version = await prisma.creativeAssetVersion.create({
      data: {
        versionNo: nextVersionNo,
        fileUrl,
        status: 'APPROVED', // Changed from 'PRODUCTION_READY' to 'APPROVED'
        creativeAssetId: assetId,
        agencyId,
        feedback: null,
      },
      include: {
        creativeAsset: {
          select: {
            id: true,
            name: true,
            type: true,
            concept: {
              select: {
                id: true,
                name: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create notification for the team
    await prisma.notification.create({
      data: {
        title: 'Production Asset Attached',
        message: `Production version v${nextVersionNo} attached to "${asset.name}"`,
        type: 'SUCCESS',
        actionUrl: `/dashboard/projects/${asset.concept.projectId}/concepts/${asset.conceptId}/assets/${assetId}`,
        userId: session.user.id,
        agencyId,
      },
    });

    return NextResponse.json({
      success: true,
      version,
      message: 'Production asset attached successfully',
    });
  } catch (error) {
    console.error('Error attaching production asset:', error);
    return NextResponse.json(
      { error: 'Failed to attach production asset' },
      { status: 500 }
    );
  }
}