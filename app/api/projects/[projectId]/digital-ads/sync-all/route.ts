// app/api/projects/[projectId]/digital-ads/sync-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { MetaMarketingService } from '@/lib/services/ad-platform/meta.service';

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

    // Get all active campaigns for this project
    const campaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        projectId,
        agencyId: session.user.agencyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    const metaService = new MetaMarketingService(session.user.agencyId);

    for (const campaign of campaigns) {
      try {
        if (campaign.platform === 'FACEBOOK' || campaign.platform === 'INSTAGRAM') {
          await metaService.syncCampaign(campaign.id);
        }
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${campaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Synced ${results.synced} campaigns, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('Error syncing campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to sync campaigns' },
      { status: 500 }
    );
  }
}