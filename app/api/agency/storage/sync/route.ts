// app/api/agency/storage/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSyncService, getCloudStorageService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const { agencyId, assetId } = await req.json();
    
    // ✅ Validate required fields
    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    // ✅ Get SyncService with cloudStorage dependency
    const syncService = getSyncService();
    
    // ✅ If specific assetId provided, sync just that asset
    if (assetId) {
      await syncService.syncAssetVersions(assetId);
      return NextResponse.json({ 
        success: true, 
        message: `Sync initiated for asset ${assetId}` 
      });
    }
    
    // ✅ Otherwise sync all files for the agency
    await syncService.syncAgencyFiles(agencyId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Sync initiated for agency ${agencyId}` 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error during sync:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}