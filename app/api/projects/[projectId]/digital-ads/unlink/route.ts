// app/api/projects/[projectId]/digital-ads/unlink/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { campaignId } = await req.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Verify campaign exists and is linked to this project
    const campaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: campaignId,
        projectId: projectId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or not linked to this project' },
        { status: 404 }
      );
    }

    // Unlink campaign from project (disconnect relationship)
    await prisma.digitalAdCampaign.update({
      where: { id: campaignId },
      data: {
        project: {
          disconnect: true,
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: campaignId,
        message: `Unlinked digital ad campaign ${campaign.name} from project`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          projectId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign unlinked successfully',
    });
  } catch (error) {
    console.error('Error unlinking campaign:', error);
    return NextResponse.json(
      { error: 'Failed to unlink campaign' },
      { status: 500 }
    );
  }
}