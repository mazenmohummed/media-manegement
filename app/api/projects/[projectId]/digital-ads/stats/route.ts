// app/api/campaigns/[campaignId]/digital-ads/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> } // ✅ Promise
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

    // ✅ Await params before accessing
    const { campaignId } = await params;

    // Verify campaign exists and belongs to agency
    // ✅ Also changed findUnique → findFirst (agencyId/deletedAt are not unique)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get all projects under this campaign
    const projects = await prisma.project.findMany({
      where: {
        campaigns: { some: { id: campaignId } }, // ✅ many-to-many relation
        agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        digitalAdCampaigns: {
          where: { deletedAt: null },
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

    projects.forEach((project) => {
      project.digitalAdCampaigns.forEach((ad) => {
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

        // Metrics
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
    });

    return NextResponse.json({
      campaignId,
      summary: {
        totalAdCount,
        totalBudget,
        totalProjects: projects.length,
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
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        adCount: project.digitalAdCampaigns.length,
        totalBudget: project.digitalAdCampaigns.reduce(
          (sum, ad) => sum + (ad.budget || 0),
          0
        ),
        ads: project.digitalAdCampaigns.map((ad) => ({
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
      })),
    });
  } catch (error) {
    console.error('Error fetching campaign ad stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad statistics' },
      { status: 500 }
    );
  }
}