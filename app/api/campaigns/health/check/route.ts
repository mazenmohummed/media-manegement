// app/api/campaigns/health/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { CampaignHealthService } from '@/lib/services/campaign-health.service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const { campaignId } = await req.json();

    const healthService = new CampaignHealthService(agencyId);

    if (campaignId) {
      // Check single campaign
      const result = await healthService.checkCampaignHealth(campaignId);
      return NextResponse.json({ result });
    } else {
      // Check all active campaigns
      const results = await healthService.checkAllActiveCampaigns();
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error('Error checking campaign health:', error);
    return NextResponse.json(
      { error: 'Failed to check campaign health' },
      { status: 500 }
    );
  }
}