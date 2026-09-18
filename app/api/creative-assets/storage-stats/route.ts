// app/api/creative-assets/storage-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getHybridStorageService } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hybridStorage = getHybridStorageService(session.user.agencyId);
    const stats = await hybridStorage.getStorageStats();

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    );
  }
}