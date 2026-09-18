// app/api/projects/[projectId]/digital-ads/[adId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const updateDigitalAdSchema = z.object({
  name: z.string().min(1).optional(),
  platform: z
    .enum([
      'FACEBOOK',
      'INSTAGRAM',
      'TIKTOK',
      'GOOGLE',
      'YOUTUBE',
      'SNAPCHAT',
      'X',
      'LINKEDIN',
      'OTHER',
    ])
    .optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().optional(),
  landingPageUrl: z.string().url().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  pixelId: z.string().optional(),
  audienceSegment: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
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

    // ✅ Use findFirst — projectId, agencyId, deletedAt are not unique
    const adCampaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        projectId,
        agencyId,
        deletedAt: null,
      },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                clientName: true,
                clientNo: true,
              },
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            budget: true,
          },
        },
        metrics: {
          orderBy: {
            date: 'desc',
          },
          take: 30,
        },
        agency: {
          select: {
            id: true,
            agencyName: true,
            defaultCurrency: true,
          },
        },
      },
    });

    if (!adCampaign) {
      return NextResponse.json(
        { error: 'Ad campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ adCampaign });
  } catch (error) {
    console.error('Error fetching ad campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad campaign' },
      { status: 500 }
    );
  }
}

// ─── PUT ────────────────────────────────────────────────────────────────

export async function PUT(
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

    const actorId = session.user.id ?? 'system';

    const body = await req.json();
    const validatedData = updateDigitalAdSchema.parse(body);

    // Check if ad campaign exists with all fields
    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        projectId,
        agencyId,
        deletedAt: null,
      },
      include: {
        project: true,
      },
    });

    if (!existingAd) {
      return NextResponse.json(
        { error: 'Ad campaign not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    if (validatedData.status) {
      const statusFlow: Record<string, string[]> = {
        DRAFT: ['ACTIVE', 'PAUSED'],
        ACTIVE: ['PAUSED', 'COMPLETED'],
        PAUSED: ['ACTIVE', 'COMPLETED'],
        COMPLETED: [],
      };

      const allowedTransitions = statusFlow[existingAd.status] || [];
      if (!allowedTransitions.includes(validatedData.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existingAd.status} to ${validatedData.status}`,
          },
          { status: 400 }
        );
      }
    }

    // Get UTM values from validated data or existing ad
    const utmSource =
      validatedData.utmSource !== undefined
        ? validatedData.utmSource
        : existingAd.utmSource;
    const utmMedium =
      validatedData.utmMedium !== undefined
        ? validatedData.utmMedium
        : existingAd.utmMedium;
    const utmCampaign =
      validatedData.utmCampaign !== undefined
        ? validatedData.utmCampaign
        : existingAd.utmCampaign;
    const utmTerm =
      validatedData.utmTerm !== undefined
        ? validatedData.utmTerm
        : existingAd.utmTerm;
    const utmContent =
      validatedData.utmContent !== undefined
        ? validatedData.utmContent
        : existingAd.utmContent;

    // Rebuild tracking URL if UTM fields changed
    let trackingUrl =
      validatedData.landingPageUrl || existingAd.landingPageUrl;
    if (trackingUrl) {
      try {
        const url = new URL(trackingUrl);

        if (utmSource) url.searchParams.set('utm_source', utmSource);
        if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (utmTerm) url.searchParams.set('utm_term', utmTerm);
        if (utmContent) url.searchParams.set('utm_content', utmContent);

        trackingUrl = url.toString();
      } catch (urlError) {
        console.warn('Invalid URL for tracking:', trackingUrl);
        trackingUrl =
          validatedData.landingPageUrl || existingAd.landingPageUrl;
      }
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.platform !== undefined)
      updateData.platform = validatedData.platform;
    if (validatedData.budget !== undefined)
      updateData.budget = validatedData.budget;
    if (validatedData.currency !== undefined)
      updateData.currency = validatedData.currency;
    if (validatedData.utmSource !== undefined)
      updateData.utmSource = validatedData.utmSource;
    if (validatedData.utmMedium !== undefined)
      updateData.utmMedium = validatedData.utmMedium;
    if (validatedData.utmCampaign !== undefined)
      updateData.utmCampaign = validatedData.utmCampaign;
    if (validatedData.utmTerm !== undefined)
      updateData.utmTerm = validatedData.utmTerm;
    if (validatedData.utmContent !== undefined)
      updateData.utmContent = validatedData.utmContent;
    if (validatedData.pixelId !== undefined)
      updateData.pixelId = validatedData.pixelId;
    if (validatedData.audienceSegment !== undefined)
      updateData.audienceSegment = validatedData.audienceSegment;
    if (validatedData.startDate !== undefined)
      updateData.startDate = validatedData.startDate;
    if (validatedData.endDate !== undefined)
      updateData.endDate = validatedData.endDate;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;
    if (trackingUrl !== undefined) updateData.landingPageUrl = trackingUrl;

    // ✅ `update` requires a unique `where`, so only pass `id`
    const adCampaign = await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: updateData,
      include: {
        project: {
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
        action: 'UPDATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: adCampaign.id,
        message: `Updated digital ad campaign ${adCampaign.name}`,
        agencyId,
        actorId,
        metadata: {
          changes: Object.keys(updateData),
          utm: {
            source: adCampaign.utmSource,
            medium: adCampaign.utmMedium,
            campaign: adCampaign.utmCampaign,
            term: adCampaign.utmTerm,
            content: adCampaign.utmContent,
          },
        },
      },
    });

    return NextResponse.json({ adCampaign });
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
    console.error('Error updating ad campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update ad campaign' },
      { status: 500 }
    );
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────

export async function DELETE(
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

    const actorId = session.user.id ?? 'system';

    // Check if ad campaign exists
    const existingAd = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        projectId,
        agencyId,
        deletedAt: null,
      },
    });

    if (!existingAd) {
      return NextResponse.json(
        { error: 'Ad campaign not found' },
        { status: 404 }
      );
    }

    // Check if ad campaign has metrics (prevent deletion if it has data)
    const metricCount = await prisma.adMetricSnapshot.count({
      where: {
        adCampaignId: adId,
      },
    });

    if (metricCount > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete ad campaign with existing metrics data. Archive it instead.',
        },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: { deletedAt: new Date() },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: adId,
        message: `Deleted digital ad campaign ${existingAd.name}`,
        agencyId,
        actorId,
        metadata: {
          platform: existingAd.platform,
          budget: existingAd.budget,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ad campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete ad campaign' },
      { status: 500 }
    );
  }
}