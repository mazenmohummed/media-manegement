// app/api/digital-ads/[adId]/generate-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

const schema = z.object({
  landingPageUrl: z.string().url('Invalid URL'),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
});

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
    const data = schema.parse(body);

    // Verify campaign
    const campaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: adId,
        agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Build URL
    const url = new URL(data.landingPageUrl);
    if (data.utmSource) url.searchParams.set('utm_source', data.utmSource);
    if (data.utmMedium) url.searchParams.set('utm_medium', data.utmMedium);
    if (data.utmCampaign) url.searchParams.set('utm_campaign', data.utmCampaign);
    if (data.utmTerm) url.searchParams.set('utm_term', data.utmTerm);
    if (data.utmContent) url.searchParams.set('utm_content', data.utmContent);

    const trackingUrl = url.toString();

    // Save
    await prisma.digitalAdCampaign.update({
      where: { id: adId },
      data: {
        landingPageUrl: trackingUrl,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
      },
    });

    return NextResponse.json({ success: true, trackingUrl });
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
    console.error('Error generating URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate tracking URL' },
      { status: 500 }
    );
  }
}