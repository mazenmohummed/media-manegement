// app/api/projects/[projectId]/campaigns/link/route.ts
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
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // ✅ Link campaign to project via many-to-many
    await prisma.project.update({
      where: { id: projectId },
      data: {
        campaigns: {
          connect: { id: campaignId },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'PROJECT',
        entityId: projectId,
        message: `Linked campaign ${campaign.name} to project ${project.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          campaignId,
          campaignName: campaign.name,
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