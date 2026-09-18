// app/api/projects/[projectId]/digital-ads/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID not found' },
        { status: 400 }
      );
    }

    // Await params before accessing (Next.js 16 requirement)
    const { projectId } = await params;

    // Verify project exists and belongs to agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all digital ad campaigns under this project
    const digitalAdCampaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        projectId,
        agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        platform: true,
        status: true,
        budget: true,
        currency: true,
        startDate: true,
        endDate: true,
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            reach: true,
            impressions: true,
            clicks: true,
            ctr: true,
            cpc: true,
            cpm: true,
            spend: true,
            conversions: true,
            revenue: true,
            roas: true,
            leads: true,
            engagement: true,
          },
        },
      },
    });

    // Aggregate stats across all ad campaigns
    let totalAdCount = 0;
    let totalBudget = 0;
    const statusBreakdown: Record<string, number> = {};
    const platformBreakdown: Record<
      string,
      { count: number; budget: number }
    > = {};
    let totalReach = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    let totalLeads = 0;
    let totalEngagement = 0;

    digitalAdCampaigns.forEach((ad) => {
      totalAdCount++;
      totalBudget += ad.budget || 0;

      // Status breakdown
      statusBreakdown[ad.status] = (statusBreakdown[ad.status] || 0) + 1;

      // Platform breakdown
      if (!platformBreakdown[ad.platform]) {
        platformBreakdown[ad.platform] = { count: 0, budget: 0 };
      }
      platformBreakdown[ad.platform].count += 1;
      platformBreakdown[ad.platform].budget += ad.budget || 0;

      // Metrics (latest snapshot only)
      if (ad.metrics.length > 0) {
        const m = ad.metrics[0];
        totalReach += m.reach || 0;
        totalImpressions += m.impressions || 0;
        totalClicks += m.clicks || 0;
        totalSpend += m.spend || 0;
        totalConversions += m.conversions || 0;
        totalRevenue += m.revenue || 0;
        totalLeads += m.leads || 0;
        totalEngagement += m.engagement || 0;
      }
    });

    return NextResponse.json({
      projectId,
      projectName: project.name,
      summary: {
        totalAdCount,
        totalBudget,
      },
      statusBreakdown,
      platformBreakdown,
      metrics: {
        totalReach,
        totalImpressions,
        totalClicks,
        totalSpend,
        totalConversions,
        totalRevenue,
        totalLeads,
        totalEngagement,
        averageCTR:
          totalImpressions > 0
            ? (totalClicks / totalImpressions) * 100
            : 0,
        averageCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
        averageCPM:
          totalImpressions > 0
            ? (totalSpend / totalImpressions) * 1000
            : 0,
        averageROAS: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      },
      ads: digitalAdCampaigns.map((ad) => ({
        id: ad.id,
        name: ad.name,
        platform: ad.platform,
        status: ad.status,
        budget: ad.budget,
        currency: ad.currency,
        startDate: ad.startDate,
        endDate: ad.endDate,
        latestMetrics: ad.metrics.length > 0 ? ad.metrics[0] : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching project ad stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad statistics' },
      { status: 500 }
    );
  }
}