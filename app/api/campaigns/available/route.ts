// app/api/campaigns/available/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { searchParams } = new URL(req.url);
    const excludeProjectId = searchParams.get('excludeProjectId');
    const search = searchParams.get('search') || '';

    console.log('🔍 Fetching available campaigns:', { agencyId, excludeProjectId, search });

    // Build where clause
    const where: any = {
      agencyId: agencyId,
      deletedAt: null,
    };

    // If we need to exclude projects linked to a specific project
    // We'll handle this in the filter step below

    // Get all campaigns for the agency with client included
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            clientNo: true,
          },
        },
        projects: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            projects: true,
            digitalAdCampaigns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total campaigns found: ${allCampaigns.length}`);

    // Filter out campaigns already linked to the project
    let available = allCampaigns;
    if (excludeProjectId) {
      available = allCampaigns.filter(campaign => {
        const isLinkedToProject = campaign.projects.some(p => p.id === excludeProjectId);
        return !isLinkedToProject;
      });
    }

    console.log(`📊 Available campaigns after filtering: ${available.length}`);

    // Apply search filter
    let filtered = available;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = available.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.campaignNo?.toLowerCase().includes(searchLower)) ||
        (c.objective?.toLowerCase().includes(searchLower)) ||
        (c.client?.clientName?.toLowerCase().includes(searchLower))
      );
      console.log(`📊 After search filter: ${filtered.length}`);
    }

    // Format the response
    const campaigns = filtered.map(campaign => ({
      id: campaign.id,
      campaignNo: campaign.campaignNo,
      name: campaign.name,
      objective: campaign.objective,
      budget: campaign.budget,
      currency: campaign.currency,
      status: campaign.status,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      client: campaign.client || { id: '', clientName: 'No Client', clientNo: null },
      _count: {
        projects: campaign._count?.projects || 0,
        digitalAdCampaigns: campaign._count?.digitalAdCampaigns || 0,
      },
      createdAt: campaign.createdAt ? campaign.createdAt.toISOString() : null,
      updatedAt: campaign.updatedAt ? campaign.updatedAt.toISOString() : null,
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching available campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available campaigns' },
      { status: 500 }
    );
  }
}