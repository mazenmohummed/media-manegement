// app/api/projects/[projectId]/digital-ads/[adId]/metrics/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';

const importRowSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  reach: z.number().min(0).default(0),
  impressions: z.number().min(0).default(0),
  clicks: z.number().min(0).default(0),
  spend: z.number().min(0).default(0),
  conversions: z.number().min(0).default(0),
  revenue: z.number().min(0).default(0),
  leads: z.number().min(0).default(0),
  engagement: z.number().min(0).default(0),
});

interface ImportResult {
  success: boolean;
  rowIndex: number;
  error?: string;
  data?: any;
  action?: 'created' | 'updated' | 'skipped';
}

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
    const { rows, skipDuplicates = false, updateExisting = true } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows provided for import' },
        { status: 400 }
      );
    }

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

    const results: ImportResult[] = [];
    const errors: ImportResult[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Validate row data
        const validatedData = importRowSchema.parse(row);

        // Compute derived metrics
        const ctr =
          validatedData.impressions > 0
            ? (validatedData.clicks / validatedData.impressions) * 100
            : 0;
        const cpc =
          validatedData.clicks > 0
            ? validatedData.spend / validatedData.clicks
            : 0;
        const cpm =
          validatedData.impressions > 0
            ? (validatedData.spend / validatedData.impressions) * 1000
            : 0;
        const roas =
          validatedData.spend > 0
            ? validatedData.revenue / validatedData.spend
            : 0;

        // Normalize date to UTC midnight to match the unique constraint
        const metricDate = new Date(validatedData.date);
        metricDate.setUTCHours(0, 0, 0, 0);

        // Check for existing metric
        const existingMetric = await prisma.adMetricSnapshot.findUnique({
          where: {
            adCampaignId_date: {
              adCampaignId: adId,
              date: metricDate,
            },
          },
        });

        let metric;
        let action: 'created' | 'updated' | 'skipped' = 'created';

        if (existingMetric) {
          if (skipDuplicates) {
            results.push({
              success: true,
              rowIndex: i,
              data: validatedData,
              action: 'skipped',
            });
            continue;
          }

          if (updateExisting) {
            metric = await prisma.adMetricSnapshot.update({
              where: { id: existingMetric.id },
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
                source: 'csv_import',
                syncedAt: new Date(),
              },
            });
            action = 'updated';
          } else {
            results.push({
              success: true,
              rowIndex: i,
              data: validatedData,
              action: 'skipped',
            });
            continue;
          }
        } else {
          // Create new metric
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
              source: 'csv_import',
              syncedAt: new Date(),
            },
          });
          action = 'created';
        }

        results.push({
          success: true,
          rowIndex: i,
          data: validatedData,
          action,
        });
      } catch (error) {
        const errorMessage =
          error instanceof z.ZodError
            ? error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : error instanceof Error
            ? error.message
            : 'Unknown error';

        errors.push({
          success: false,
          rowIndex: i,
          error: errorMessage,
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'AD_METRIC_IMPORT',
        entityId: adId,
        message: `Imported ${results.length} metrics for ad campaign ${adCampaign.name}`,
        agencyId,
        actorId: session.user.id || 'system',
        metadata: {
          totalRows: rows.length,
          successful: results.length,
          errors: errors.length,
          hasErrors: errors.length > 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      successful: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
      hasErrors: errors.length > 0,
      message:
        errors.length > 0
          ? `${results.length} rows imported successfully, ${errors.length} rows had errors`
          : `All ${results.length} rows imported successfully`,
    });
  } catch (error) {
    console.error('Error importing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to import metrics' },
      { status: 500 }
    );
  }
}