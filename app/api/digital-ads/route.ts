// app/api/digital-ads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum([
    'FACEBOOK',
    'INSTAGRAM',
    'TIKTOK',
    'GOOGLE',
    'YOUTUBE',
    'SNAPCHAT',
    'X',
    'LINKEDIN',
    'OTHER',
  ]),
  budget: z.number().min(0),
  currency: z.string().default('EGP'),
  landingPageUrl: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  pixelId: z.string().optional().nullable(),
  audienceSegment: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('DRAFT'),
  projectId: z.string().optional().nullable(),
});

// ─── GET: List All Digital Ad Campaigns for Agency ──────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');

    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { audienceSegment: { contains: search, mode: 'insensitive' } },
      ];
    }

    const campaigns = await prisma.digitalAdCampaign.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectNo: true } },
        campaign: { select: { id: true, name: true } },
        metrics: { orderBy: { date: 'desc' }, take: 1 },
        _count: { select: { metrics: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching digital ads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// ─── POST: Create Digital Ad Campaign ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    // Validate project if provided
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          agencyId: session.user.agencyId,
          deletedAt: null,
        },
      });
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Auto-generate UTM campaign if missing
    let utmCampaign = data.utmCampaign;
    if (!utmCampaign && data.landingPageUrl) {
      utmCampaign = `${data.name.toLowerCase().replace(/\s+/g, '-')}-${data.platform.toLowerCase()}`;
    }

    // Build tracking URL
    let landingPageUrl = data.landingPageUrl;
    if (
      landingPageUrl &&
      (data.utmSource || data.utmMedium || utmCampaign)
    ) {
      try {
        const url = new URL(landingPageUrl);
        if (data.utmSource) url.searchParams.set('utm_source', data.utmSource);
        if (data.utmMedium) url.searchParams.set('utm_medium', data.utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (data.utmTerm) url.searchParams.set('utm_term', data.utmTerm);
        if (data.utmContent)
          url.searchParams.set('utm_content', data.utmContent);
        landingPageUrl = url.toString();
      } catch {
        // Keep original URL if invalid
      }
    }

    const adCampaign = await prisma.digitalAdCampaign.create({
      data: {
        name: data.name,
        platform: data.platform,
        status: data.status,
        budget: data.budget,
        currency: data.currency,
        landingPageUrl: landingPageUrl || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
        pixelId: data.pixelId || null,
        audienceSegment: data.audienceSegment || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        projectId: data.projectId || null,
        agencyId: session.user.agencyId,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: adCampaign.id,
        message: `Created digital ad campaign ${adCampaign.name}`,
        agencyId: session.user.agencyId,
        actorId: session.user.id,
        metadata: {
          platform: adCampaign.platform,
          budget: adCampaign.budget,
          projectId: adCampaign.projectId,
        },
      },
    });

    return NextResponse.json({ campaign: adCampaign }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    console.error('Error creating digital ad campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}