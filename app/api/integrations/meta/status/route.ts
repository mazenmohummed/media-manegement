// app/api/integrations/meta/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { MetaMarketingService } from '@/lib/services/ad-platform/meta.service';
import { prisma } from '@/lib/prisma'; // Add this import

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const metaService = new MetaMarketingService(agencyId);
    const credentials = await metaService.getCredentials();
    const isValid = await metaService.validateConnection();

    const integration = await prisma.agencyIntegration.findFirst({
      where: {
        agencyId: agencyId,
        platform: 'META',
      },
    });

    return NextResponse.json({
      connected: !!credentials,
      isValid,
      isActive: integration?.isActive ?? false,
      lastError: integration?.lastError,
      lastErrorAt: integration?.lastErrorAt,
      expiresAt: integration?.expiresAt,
    });
  } catch (error) {
    console.error('Error checking Meta status:', error);
    return NextResponse.json(
      { error: 'Failed to check Meta status' },
      { status: 500 }
    );
  }
}