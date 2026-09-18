// app/api/integrations/meta/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { MetaMarketingService } from '@/lib/services/ad-platform/meta.service';
import { prisma } from '@/lib/prisma'; // Add this import

export async function POST(req: NextRequest) {
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
    const { accessToken, refreshToken, expiresIn, adAccountId } = body;

    if (!accessToken || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const metaService = new MetaMarketingService(agencyId);

    await metaService.storeCredentials({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn || 86400) * 1000,
      accountId: adAccountId,
      adAccountId: adAccountId,
    });

    // Mark integration as active
    await prisma.agencyIntegration.update({
      where: {
        agencyId_platform: {
          agencyId: agencyId,
          platform: 'META',
        },
      },
      data: {
        isActive: true,
        lastError: null,
        lastErrorAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting Meta:', error);
    return NextResponse.json(
      { error: 'Failed to connect Meta account' },
      { status: 500 }
    );
  }
}