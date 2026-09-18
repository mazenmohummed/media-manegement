// app/api/projects/[projectId]/digital-ads/[adId]/generate-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; adId: string } }
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

    const body = await req.json();
    const { landingPageUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = body;

    if (!landingPageUrl) {
      return NextResponse.json(
        { error: 'Landing page URL is required' },
        { status: 400 }
      );
    }

    // Check if ad campaign exists and belongs to agency
    const existingAd = await prisma.digitalAdCampaign.findUnique({
      where: {
        id: params.adId,
        projectId: params.projectId,
        agencyId: agencyId,
        deletedAt: null,
      },
    });

    if (!existingAd) {
      return NextResponse.json({ error: 'Ad campaign not found' }, { status: 404 });
    }

    // Build tracking URL
    let trackingUrl: string;
    try {
      const url = new URL(landingPageUrl);
      if (utmSource) url.searchParams.set('utm_source', utmSource);
      if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
      if (utmTerm) url.searchParams.set('utm_term', utmTerm);
      if (utmContent) url.searchParams.set('utm_content', utmContent);
      trackingUrl = url.toString();
    } catch (urlError) {
      return NextResponse.json(
        { error: 'Invalid landing page URL' },
        { status: 400 }
      );
    }

    // Update the ad campaign with the new tracking URL
    const updatedAd = await prisma.digitalAdCampaign.update({
      where: {
        id: params.adId,
        projectId: params.projectId,
        agencyId: agencyId,
      },
      data: {
        landingPageUrl: trackingUrl,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        utmTerm: utmTerm || undefined,
        utmContent: utmContent || undefined,
      },
    });

    // Log audit
    const actorId = session.user.id ?? 'system';
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'DIGITAL_AD_CAMPAIGN',
        entityId: params.adId,
        message: `Generated tracking URL for ad campaign ${updatedAd.name}`,
        agencyId: agencyId,
        actorId: actorId,
        metadata: {
          trackingUrl,
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
        },
      },
    });

    return NextResponse.json({ 
      success: true,
      trackingUrl,
      message: 'Tracking URL generated and saved successfully'
    });
  } catch (error) {
    console.error('Error generating tracking URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate tracking URL' },
      { status: 500 }
    );
  }
}