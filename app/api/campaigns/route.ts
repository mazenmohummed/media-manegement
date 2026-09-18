// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const campaignSchema = z.object({
  name: z.string().min(1),
  objective: z.string().optional(),
  budget: z.number().min(0),
  currency: z.string().default('EGP'),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)).optional(),
  clientId: z.string().min(1),
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projects = {
        some: { id: projectId }
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { campaignNo: { contains: search, mode: 'insensitive' } },
        { client: { clientName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const campaigns = await prisma.campaign.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = campaignSchema.parse(body);

    // Generate campaign number
    const count = await prisma.campaign.count({
      where: { agencyId: session.user.agencyId },
    });
    const campaignNo = `CMP-${String(count + 1).padStart(4, '0')}`;

    // Create campaign with proper type handling
    const campaign = await prisma.campaign.create({
      data: {
        campaignNo: campaignNo,
        name: validatedData.name,
        objective: validatedData.objective,
        budget: validatedData.budget,
        currency: validatedData.currency,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        status: validatedData.status,
        agencyId: session.user.agencyId,
        clientId: validatedData.clientId,
      },
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
        action: 'CREATE',
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        message: `Created campaign ${campaign.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          campaignNo: campaign.campaignNo,
          budget: campaign.budget,
          clientId: campaign.clientId,
        },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
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
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}