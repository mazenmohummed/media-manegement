// app/api/projects/[projectId]/digital-ads/available/route.ts
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
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Show digital ad campaigns that are:
    // 1. In the same agency
    // 2. Not deleted
    // 3. NOT already linked to THIS project
    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
      OR: [
        { projectId: null },                  // Unlinked
        { projectId: { not: projectId } },    // Linked to a DIFFERENT project
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { platform: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const campaigns = await prisma.digitalAdCampaign.findMany({
      where,
      include: {
        _count: {
          select: {
            metrics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const serializedCampaigns = campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      budget: campaign.budget,
      currency: campaign.currency,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      _count: {
        metrics: campaign._count.metrics,
      },
    }));

    return NextResponse.json({ campaigns: serializedCampaigns });
  } catch (error) {
    console.error('Error fetching available digital ad campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available campaigns' },
      { status: 500 }
    );
  }
}