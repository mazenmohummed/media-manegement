// app/api/campaigns/health/thresholds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const thresholdSchema = z.object({
  campaignId: z.string().optional(),
  minCTR: z.number().optional(),
  minROAS: z.number().optional(),
  maxCPC: z.number().optional(),
  minReach: z.number().optional(),
  minConversions: z.number().optional(),
});

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

    const searchParams = req.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    // For now, return default thresholds
    // In production, these would be stored in a settings table
    const defaultThresholds = {
      minCTR: 1.5,
      minROAS: 2.0,
      maxCPC: 5.0,
      minReach: 1000,
      minConversions: 10,
    };

    // Check if campaign has custom thresholds
    // This would be stored in a campaign_health_settings table or metadata
    // For now, return defaults
    return NextResponse.json({
      thresholds: defaultThresholds,
      isDefault: true,
    });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thresholds' },
      { status: 500 }
    );
  }
}

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
    const validatedData = thresholdSchema.parse(body);

    // In production, save to a settings table
    // For now, just return success

    return NextResponse.json({
      success: true,
      thresholds: validatedData,
      message: 'Thresholds updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues }, // Changed from error.errors to error.issues
        { status: 400 }
      );
    }
    console.error('Error updating thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to update thresholds' },
      { status: 500 }
    );
  }
}