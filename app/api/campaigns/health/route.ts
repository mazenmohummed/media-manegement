// app/api/campaigns/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { CampaignHealthService } from '@/lib/services/campaign-health.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const healthService = new CampaignHealthService(agencyId);
    const dashboard = await healthService.getHealthDashboard();

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching campaign health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign health' },
      { status: 500 }
    );
  }
}