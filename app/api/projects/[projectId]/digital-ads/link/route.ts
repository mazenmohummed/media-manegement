// app/api/projects/[projectId]/digital-ads/link/route.ts
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

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify campaign exists
    const campaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: campaignId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Link campaign to project
    await prisma.digitalAdCampaign.update({
      where: { id: campaignId },
      data: { projectId: projectId },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: campaignId,
        message: `Linked digital ad campaign ${campaign.name} to project ${project.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          projectId,
          projectName: project.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign linked successfully',
    });
  } catch (error) {
    console.error('Error linking campaign:', error);
    return NextResponse.json(
      { error: 'Failed to link campaign' },
      { status: 500 }
    );
  }
}