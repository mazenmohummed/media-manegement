// app/api/campaigns/[campaignId]/projects/route.ts (full version with POST)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  projectName: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).default('DRAFT'),
  totalValue: z.number().min(0).default(0),
  currency: z.string().default('EGP'),
  targetDeadline: z.string().transform(str => new Date(str)).optional(),
  projectStory: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    if (!params.campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Verify campaign exists and belongs to the agency
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: params.campaignId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        clientId: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {
      campaignId: params.campaignId,
      agencyId: agencyId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            clientNo: true,
          },
        },
        digitalAdCampaigns: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            platform: true,
            status: true,
            budget: true,
            currency: true,
          },
        },
        tasks: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        clientId: campaign.clientId,
      },
      projects,
      total: projects.length,
    });
  } catch (error) {
    console.error('Error fetching campaign projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    if (!params.campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = createProjectSchema.parse(body);

    // Verify campaign exists and belongs to the agency
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: params.campaignId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        clientId: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify client exists and belongs to the agency
    const client = await prisma.client.findUnique({
      where: {
        id: validatedData.clientId,
        agencyId: agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        clientName: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Generate project number
    const count = await prisma.project.count({
      where: { agencyId: agencyId },
    });
    const projectNo = `PRJ-${String(count + 1).padStart(4, '0')}`;

    // Create project
    const project = await prisma.project.create({
      data: {
        projectNo: projectNo,
        name: validatedData.name,
        projectName: validatedData.projectName || validatedData.name,
        status: validatedData.status,
        totalValue: validatedData.totalValue,
        currency: validatedData.currency,
        targetDeadline: validatedData.targetDeadline,
        projectStory: validatedData.projectStory,
        agencyId: agencyId,
        clientId: validatedData.clientId,
        campaignId: params.campaignId,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'PROJECT',
        entityId: project.id,
        message: `Created project ${project.name} under campaign ${campaign.name}`,
        agencyId: agencyId,
        actorId: session.user.id,
        metadata: {
          projectNo: project.projectNo,
          campaignId: params.campaignId,
          clientId: validatedData.clientId,
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
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
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}