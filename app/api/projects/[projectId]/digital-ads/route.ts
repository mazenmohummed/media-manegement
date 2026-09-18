// app/api/projects/[projectId]/digital-ads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

// ─── Validation Schema ──────────────────────────────────────────────────

const digitalAdSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'YOUTUBE', 'SNAPCHAT', 'X', 'LINKEDIN', 'OTHER']),
  budget: z.number().min(0, 'Budget must be positive'),
  currency: z.string().default('EGP'),
  landingPageUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  pixelId: z.string().optional(),
  audienceSegment: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('DRAFT'),
});

// ─── GET: Fetch Digital Ad Campaigns for a Project ──────────────────────

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

    // Verify project belongs to agency
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const campaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        projectId: projectId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            metrics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Serialize dates and metrics
    const serializedCampaigns = campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      budget: campaign.budget,
      currency: campaign.currency,
      landingPageUrl: campaign.landingPageUrl,
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: campaign.utmCampaign,
      utmTerm: campaign.utmTerm,
      utmContent: campaign.utmContent,
      pixelId: campaign.pixelId,
      audienceSegment: campaign.audienceSegment,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      lastSyncedAt: campaign.lastSyncedAt ? campaign.lastSyncedAt.toISOString() : null,
      syncStatus: campaign.syncStatus,
      metrics: campaign.metrics[0]
        ? {
            impressions: campaign.metrics[0].impressions,
            clicks: campaign.metrics[0].clicks,
            ctr: campaign.metrics[0].ctr,
            cpc: campaign.metrics[0].cpc,
            cpm: campaign.metrics[0].cpm,
            spend: campaign.metrics[0].spend,
            conversions: campaign.metrics[0].conversions,
            revenue: campaign.metrics[0].revenue,
            roas: campaign.metrics[0].roas,
            reach: campaign.metrics[0].reach,
            leads: campaign.metrics[0].leads,
            engagement: campaign.metrics[0].engagement,
          }
        : null,
      _count: {
        metrics: campaign._count.metrics,
      },
    }));

    return NextResponse.json({ campaigns: serializedCampaigns });
  } catch (error) {
    console.error('Error fetching digital ad campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// ─── POST: Create New Digital Ad Campaign ───────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const actorId = session.user.id ?? 'system';
    const { projectId } = await params;

    const body = await req.json();
    const validatedData = digitalAdSchema.parse(body);

    // Verify project exists and belongs to agency
    // ✅ Fetch campaigns (plural) — not campaign (singular)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
      include: {
        campaigns: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate status flow
    if (validatedData.status === 'ACTIVE' && !validatedData.startDate) {
      return NextResponse.json(
        { error: 'Start date is required when activating a campaign' },
        { status: 400 }
      );
    }

    // Generate UTM campaign if not provided
    let utmCampaign = validatedData.utmCampaign;
    if (!utmCampaign) {
      utmCampaign = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${validatedData.platform.toLowerCase()}`;
    }

    // Build tracking URL
    let trackingUrl = validatedData.landingPageUrl || null;
    if (trackingUrl && (validatedData.utmSource || validatedData.utmMedium || utmCampaign)) {
      try {
        const url = new URL(trackingUrl);
        if (validatedData.utmSource) url.searchParams.set('utm_source', validatedData.utmSource);
        if (validatedData.utmMedium) url.searchParams.set('utm_medium', validatedData.utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (validatedData.utmTerm) url.searchParams.set('utm_term', validatedData.utmTerm);
        if (validatedData.utmContent) url.searchParams.set('utm_content', validatedData.utmContent);
        trackingUrl = url.toString();
      } catch (urlError) {
        console.warn('Invalid URL for tracking:', trackingUrl);
      }
    }

    // ✅ Use the first campaign from the many-to-many relation (if any)
    const linkedCampaignId = project.campaigns[0]?.id || null;

    const adCampaign = await prisma.digitalAdCampaign.create({
      data: {
        name: validatedData.name,
        platform: validatedData.platform,
        budget: validatedData.budget,
        currency: validatedData.currency,
        landingPageUrl: trackingUrl,
        utmSource: validatedData.utmSource,
        utmMedium: validatedData.utmMedium,
        utmCampaign: utmCampaign,
        utmTerm: validatedData.utmTerm,
        utmContent: validatedData.utmContent,
        pixelId: validatedData.pixelId,
        audienceSegment: validatedData.audienceSegment,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status,
        projectId: projectId,
        campaignId: linkedCampaignId,
        agencyId: agencyId,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: adCampaign.id,
        message: `Created digital ad campaign ${adCampaign.name} for project ${project.name}`,
        agencyId: agencyId,
        actorId: actorId,
        metadata: {
          platform: adCampaign.platform,
          budget: adCampaign.budget,
          projectId: projectId,
        },
      },
    });

    return NextResponse.json({ adCampaign }, { status: 201 });
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
    console.error('Error creating digital ad campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create ad campaign' },
      { status: 500 }
    );
  }
}