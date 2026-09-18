// app/api/projects/[projectId]/digital-ads/[adId]/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const metricSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  reach: z.number().min(0).default(0),
  impressions: z.number().min(0).default(0),
  clicks: z.number().min(0).default(0),
  spend: z.number().min(0).default(0),
  conversions: z.number().min(0).default(0),
  revenue: z.number().min(0).default(0),
  leads: z.number().min(0).default(0),
  engagement: z.number().min(0).default(0),
  // Computed fields (optional, for overrides)
  ctr: z.number().min(0).optional(),
  cpc: z.number().min(0).optional(),
  cpm: z.number().min(0).optional(),
  roas: z.number().min(0).optional(),
});

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; adId: string }> } // ✅ Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID not found' },
        { status: 400 }
      );
    }

    // ✅ Await params before accessing
    const { projectId, adId } = await params;

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '30');

    // Verify ad campaign exists
    // ✅ Use findFirst — projectId, agencyId, deletedAt are not unique
    const adCampaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        projectId,
        agencyId,
        deletedAt: null,
      },
    });

    if (!adCampaign) {
      return NextResponse.json(
        { error: 'Ad campaign not found' },
        { status: 404 }
      );
    }

    const where: any = {
      adCampaignId: adId,
      deletedAt: null,
    };

    // ✅ Build date filter cleanly
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const metrics = await prisma.adMetricSnapshot.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      take: limit,
    });

    // Auto-compute derived metrics if not set
    const enrichedMetrics = metrics.map((metric) => ({
      ...metric,
      ctr:
        metric.ctr ??
        (metric.impressions > 0
          ? (metric.clicks / metric.impressions) * 100
          : 0),
      cpc:
        metric.cpc ??
        (metric.clicks > 0 ? metric.spend / metric.clicks : 0),
      cpm:
        metric.cpm ??
        (metric.impressions > 0
          ? (metric.spend / metric.impressions) * 1000
          : 0),
      roas:
        metric.roas ??
        (metric.spend > 0 ? metric.revenue / metric.spend : 0),
    }));

    return NextResponse.json({
      metrics: enrichedMetrics,
      total: metrics.length,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; adId: string }> } // ✅ Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID not found' },
        { status: 400 }
      );
    }

    // ✅ Await params before accessing
    const { projectId, adId } = await params;

    const body = await req.json();
    const validatedData = metricSchema.parse(body);

    // Verify ad campaign exists
    const adCampaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        projectId,
        agencyId,
        deletedAt: null,
      },
    });

    if (!adCampaign) {
      return NextResponse.json(
        { error: 'Ad campaign not found' },
        { status: 404 }
      );
    }

    // ✅ Normalize date to UTC midnight to match the unique constraint
    const metricDate = new Date(validatedData.date);
    metricDate.setUTCHours(0, 0, 0, 0);

    // Check for existing metric on same date
    const existingMetric = await prisma.adMetricSnapshot.findUnique({
      where: {
        adCampaignId_date: {
          adCampaignId: adId,
          date: metricDate,
        },
      },
    });

    // Compute derived metrics if not provided
    const ctr =
      validatedData.ctr ??
      (validatedData.impressions > 0
        ? (validatedData.clicks / validatedData.impressions) * 100
        : 0);
    const cpc =
      validatedData.cpc ??
      (validatedData.clicks > 0
        ? validatedData.spend / validatedData.clicks
        : 0);
    const cpm =
      validatedData.cpm ??
      (validatedData.impressions > 0
        ? (validatedData.spend / validatedData.impressions) * 1000
        : 0);
    const roas =
      validatedData.roas ??
      (validatedData.spend > 0
        ? validatedData.revenue / validatedData.spend
        : 0);

    let metric;
    if (existingMetric) {
      // Update existing
      metric = await prisma.adMetricSnapshot.update({
        where: {
          id: existingMetric.id,
        },
        data: {
          reach: validatedData.reach,
          impressions: validatedData.impressions,
          clicks: validatedData.clicks,
          spend: validatedData.spend,
          conversions: validatedData.conversions,
          revenue: validatedData.revenue,
          leads: validatedData.leads,
          engagement: validatedData.engagement,
          ctr,
          cpc,
          cpm,
          roas,
          source: 'manual',
          syncedAt: new Date(),
        },
      });
    } else {
      // Create new
      metric = await prisma.adMetricSnapshot.create({
        data: {
          date: metricDate,
          reach: validatedData.reach,
          impressions: validatedData.impressions,
          clicks: validatedData.clicks,
          spend: validatedData.spend,
          conversions: validatedData.conversions,
          revenue: validatedData.revenue,
          leads: validatedData.leads,
          engagement: validatedData.engagement,
          ctr,
          cpc,
          cpm,
          roas,
          adCampaignId: adId,
          agencyId,
          source: 'manual',
          syncedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        metric,
        action: existingMetric ? 'updated' : 'created',
      },
      { status: 201 }
    );
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
    console.error('Error creating/updating metric:', error);
    return NextResponse.json(
      { error: 'Failed to save metric' },
      { status: 500 }
    );
  }
}