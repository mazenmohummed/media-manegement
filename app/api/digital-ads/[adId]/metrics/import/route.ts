// app/api/digital-ads/[adId]/metrics/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

interface CSVRow {
  date: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  conversions?: string;
  revenue?: string;
  leads?: string;
  engagement?: string;
}

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
    const { rows } = body as { rows: CSVRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows provided' },
        { status: 400 }
      );
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { error: 'Too many rows (max 1000 per import)' },
        { status: 400 }
      );
    }

    // Verify campaign
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

    // ─── Process each row ──────────────────────────────────────────────
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.date) {
          results.errors.push({ row: i + 1, error: 'Missing date' });
          results.skipped++;
          continue;
        }

        const metricDate = new Date(row.date);
        if (isNaN(metricDate.getTime())) {
          results.errors.push({ row: i + 1, error: 'Invalid date' });
          results.skipped++;
          continue;
        }
        metricDate.setUTCHours(0, 0, 0, 0);

        const reach = parseInt(row.reach || '0', 10) || 0;
        const impressions = parseInt(row.impressions || '0', 10) || 0;
        const clicks = parseInt(row.clicks || '0', 10) || 0;
        const spend = parseFloat(row.spend || '0') || 0;
        const conversions = parseInt(row.conversions || '0', 10) || 0;
        const revenue = parseFloat(row.revenue || '0') || 0;
        const leads = parseInt(row.leads || '0', 10) || 0;
        const engagement = parseInt(row.engagement || '0', 10) || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        await prisma.adMetricSnapshot.upsert({
          where: {
            adCampaignId_date: {
              adCampaignId: adId,
              date: metricDate,
            },
          },
          update: {
            reach,
            impressions,
            clicks,
            ctr,
            cpc,
            cpm,
            spend,
            conversions,
            revenue,
            roas,
            leads,
            engagement,
            source: 'csv_import',
            syncedAt: new Date(),
          },
          create: {
            date: metricDate,
            reach,
            impressions,
            clicks,
            ctr,
            cpc,
            cpm,
            spend,
            conversions,
            revenue,
            roas,
            leads,
            engagement,
            adCampaignId: adId,
            agencyId,
            source: 'csv_import',
            syncedAt: new Date(),
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        results.skipped++;
      }
    }

    // ─── Audit log ─────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'IMPORT',
        entityType: 'AD_METRIC_SNAPSHOT',
        entityId: adId,
        message: `Imported ${results.imported} metrics for campaign ${adId}`,
        agencyId,
        actorId: session.user.id,
        metadata: {
          campaignId: adId,
          imported: results.imported,
          skipped: results.skipped,
          errors: results.errors.slice(0, 10),
        },
      },
    });

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error importing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to import metrics' },
      { status: 500 }
    );
  }
}