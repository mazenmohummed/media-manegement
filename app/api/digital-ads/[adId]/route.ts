// app/api/digital-ads/[adId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const updateSchema = z.object({
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
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  projectId: z.string().optional().nullable(),
});

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

    const campaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectNo: true,
            client: { select: { id: true, clientName: true } },
          },
        },
        campaign: { select: { id: true, name: true, campaignNo: true } },
        metrics: { orderBy: { date: 'desc' }, take: 30 },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adId } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.landingPageUrl !== undefined && {
          landingPageUrl: data.landingPageUrl,
        }),
        ...(data.utmSource !== undefined && { utmSource: data.utmSource }),
        ...(data.utmMedium !== undefined && { utmMedium: data.utmMedium }),
        ...(data.utmCampaign !== undefined && {
          utmCampaign: data.utmCampaign,
        }),
        ...(data.utmTerm !== undefined && { utmTerm: data.utmTerm }),
        ...(data.utmContent !== undefined && { utmContent: data.utmContent }),
        ...(data.pixelId !== undefined && { pixelId: data.pixelId }),
        ...(data.audienceSegment !== undefined && {
          audienceSegment: data.audienceSegment,
        }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
      },
    });

    return NextResponse.json({ campaign: updated });
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
    console.error('Error updating:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adId } = await params;

    const existing = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}