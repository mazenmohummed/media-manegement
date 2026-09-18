// app/api/campaigns/[campaignId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  objective: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  clientId: z.string().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    // ✅ Await params
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        client: true,
        projects: {
          include: {
            digitalAdCampaigns: {
              where: {
                deletedAt: null,
              },
              include: {
                metrics: {
                  orderBy: {
                    date: 'desc',
                  },
                  take: 1,
                },
              },
            },
            tasks: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            digitalAdCampaigns: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const { campaignId } = await params;
    const body = await req.json();
    const validatedData = updateCampaignSchema.parse(body);

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Build update data, handling optional fields
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.objective !== undefined) updateData.objective = validatedData.objective;
    if (validatedData.budget !== undefined) updateData.budget = validatedData.budget;
    if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate;
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate;
    if (validatedData.clientId !== undefined) updateData.clientId = validatedData.clientId;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        message: `Updated campaign ${campaign.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const { campaignId } = await params;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign has active projects
    const activeProjectCount = await prisma.project.count({
      where: {
        campaignId: campaignId,
        deletedAt: null,
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'],
        },
      },
    });

    if (activeProjectCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete campaign with active projects. Archive or complete projects first.',
          activeProjectCount,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { deletedAt: new Date() },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'CAMPAIGN',
        entityId: campaignId,
        message: `Deleted campaign ${existingCampaign.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}