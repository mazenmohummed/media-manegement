// jobs/sync-agency-files.ts
import { prisma } from '@/lib/prisma';
import { getSyncService } from '@/lib/storage';

export async function syncAgencyFilesJob() {
  console.log('🔄 Starting file sync job...');
  
  try {
    // ✅ Get SyncService with dependencies
    const syncService = getSyncService();
    
    // ✅ Get all agencies with sync enabled
    const agencies = await prisma.agency.findMany({
      where: { 
        syncEnabled: true,
        storageStrategy: {
          in: ['HYBRID', 'CLOUD_ONLY']
        }
      },
      select: {
        id: true,
        agencyName: true,
        syncEnabled: true,
      }
    });

    if (agencies.length === 0) {
      console.log('ℹ️ No agencies with sync enabled found');
      return { synced: 0, failed: 0, agencies: 0 };
    }

    console.log(`📋 Found ${agencies.length} agencies to process`);
    
    const results = {
      totalAgencies: agencies.length,
      totalSynced: 0,
      totalFailed: 0,
      success: 0,
      failed: 0,
      details: [] as any[]
    };

    for (const agency of agencies) {
      try {
        console.log(`📦 Syncing files for agency: ${agency.agencyName} (${agency.id})`);
        
        const result = await syncService.syncAgencyFiles(agency.id);
        
        results.totalSynced += result.syncedCount || 0;
        results.totalFailed += result.failedCount || 0;
        results.success++;
        results.details.push({
          agencyId: agency.id,
          agencyName: agency.agencyName,
          synced: result.syncedCount || 0,
          failed: result.failedCount || 0,
          status: 'success'
        });
        
        console.log(`✅ Synced ${result.syncedCount || 0} files for ${agency.agencyName} (${result.failedCount || 0} failed)`);
        
      } catch (error) {
        results.failed++;
        results.details.push({
          agencyId: agency.id,
          agencyName: agency.agencyName,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.error(`❌ Failed to sync agency ${agency.id}:`, error);
      }
    }

    console.log(`📊 Sync job completed: ${results.success} succeeded, ${results.failed} failed`);
    console.log(`📁 Total files synced: ${results.totalSynced}, Failed: ${results.totalFailed}`);

    return results;

  } catch (error) {
    console.error('❌ Sync job failed:', error);
    throw error;
  }
}

// Run every hour
export const schedule = '0 * * * *';