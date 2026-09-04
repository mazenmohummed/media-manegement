// app/api/agency/storage/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAgencyStorageDashboard } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId');
    
    // ✅ Check if agencyId is provided
    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    // ✅ USE AgencyStorageDashboard HERE
    const dashboard = getAgencyStorageDashboard();
    const metrics = await dashboard.getStorageMetrics(agencyId);
    
    return NextResponse.json(metrics);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching storage metrics:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}