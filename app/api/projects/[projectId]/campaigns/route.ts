// app/api/projects/[projectId]/campaigns/route.ts
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

    const agencyId = session.user.agencyId;
    const { projectId } = await params;

    // Get the project with its linked campaigns (many-to-many)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        campaigns: {
          include: {
            client: {
              select: {
                id: true,
                clientName: true,
                clientNo: true,
              },
            },
            _count: {
              select: {
                projects: true,
                digitalAdCampaigns: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // ✅ project.campaigns is already an array
    // Serialize dates for the client component
    const serializedCampaigns = project.campaigns.map((campaign) => ({
      id: campaign.id,
      campaignNo: campaign.campaignNo,
      name: campaign.name,
      objective: campaign.objective,
      budget: campaign.budget,
      currency: campaign.currency,
      status: campaign.status,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      client: {
        id: campaign.client.id,
        clientName: campaign.client.clientName,
        clientNo: campaign.client.clientNo,
      },
      _count: {
        projects: campaign._count.projects,
        digitalAdCampaigns: campaign._count.digitalAdCampaigns,
      },
      createdAt: campaign.createdAt ? campaign.createdAt.toISOString() : null,
      updatedAt: campaign.updatedAt ? campaign.updatedAt.toISOString() : null,
    }));

    return NextResponse.json({ campaigns: serializedCampaigns });
  } catch (error) {
    console.error('Error fetching project campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}