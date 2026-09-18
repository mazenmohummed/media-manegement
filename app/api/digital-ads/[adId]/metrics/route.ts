// app/api/digital-ads/[adId]/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

// ─── Validation Schema ──────────────────────────────────────────────────

const metricSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  reach: z.number().int().min(0).default(0),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  spend: z.number().min(0).default(0),
  conversions: z.number().int().min(0).default(0),
  revenue: z.number().min(0).default(0),
  leads: z.number().int().min(0).default(0),
  engagement: z.number().int().min(0).default(0),
});

// ─── GET: List All Metrics ──────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Verify campaign belongs to agency
    const adCampaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!adCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Build date filter
    const where: any = {
      adCampaignId: adId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const metrics = await prisma.adMetricSnapshot.findMany({
      where,
      orderBy: { date: 'asc' },
      take: Math.min(limit, 1000),
    });

    // Serialize dates
    const serializedMetrics = metrics.map((m) => ({
      id: m.id,
      date: m.date.toISOString(),
      reach: m.reach,
      impressions: m.impressions,
      clicks: m.clicks,
      ctr: m.ctr,
      cpc: m.cpc,
      cpm: m.cpm,
      spend: m.spend,
      conversions: m.conversions,
      revenue: m.revenue,
      roas: m.roas,
      leads: m.leads,
      engagement: m.engagement,
      syncedAt: m.syncedAt?.toISOString() || null,
      source: m.source,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json({ metrics: serializedMetrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// ─── POST: Create or Upsert a Metric ────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { adId } = await params;

    const body = await req.json();
    const data = metricSchema.parse(body);

    // Verify campaign belongs to agency
    const adCampaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!adCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // ─── Calculate derived metrics ─────────────────────────────────────
    const ctr =
      data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
    const cpc = data.clicks > 0 ? data.spend / data.clicks : 0;
    const cpm =
      data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0;
    const roas = data.spend > 0 ? data.revenue / data.spend : 0;

    // ─── Normalize date to midnight UTC (for unique constraint) ────────
    const metricDate = new Date(data.date);
    metricDate.setUTCHours(0, 0, 0, 0);

    // ─── Upsert (one metric per campaign per day) ──────────────────────
    const metric = await prisma.adMetricSnapshot.upsert({
      where: {
        adCampaignId_date: {
          adCampaignId: adId,
          date: metricDate,
        },
      },
      update: {
        reach: data.reach,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr,
        cpc,
        cpm,
        spend: data.spend,
        conversions: data.conversions,
        revenue: data.revenue,
        roas,
        leads: data.leads,
        engagement: data.engagement,
        source: 'manual',
        syncedAt: new Date(),
      },
      create: {
        date: metricDate,
        reach: data.reach,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr,
        cpc,
        cpm,
        spend: data.spend,
        conversions: data.conversions,
        revenue: data.revenue,
        roas,
        leads: data.leads,
        engagement: data.engagement,
        adCampaignId: adId,
        agencyId,
        source: 'manual',
        syncedAt: new Date(),
      },
    });

    // ─── Audit log ─────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'AD_METRIC_SNAPSHOT',
        entityId: metric.id,
        message: `Added/updated metric for campaign ${adId} on ${metricDate.toISOString().split('T')[0]}`,
        agencyId,
        actorId: session.user.id,
        metadata: {
          campaignId: adId,
          date: metricDate.toISOString(),
          spend: data.spend,
          conversions: data.conversions,
        },
      },
    });

    return NextResponse.json({ metric }, { status: 201 });
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
    console.error('Error creating metric:', error);
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}