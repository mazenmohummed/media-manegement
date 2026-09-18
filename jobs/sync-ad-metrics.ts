// jobs/sync-ad-metrics.ts
import { prisma } from '@/lib/prisma';
import { SyncSchedulerService } from '@/lib/services/sync-scheduler.service';

export async function syncAdMetricsJob() {
  console.log('🔄 Starting ad metrics sync...');

  // Get all agencies with active integrations
  const agencies = await prisma.agency.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const results = [];

  for (const agency of agencies) {
    try {
      const syncService = new SyncSchedulerService(agency.id);
      const result = await syncService.syncAll();
      
      results.push({
        agencyId: agency.id,
        ...result,
      });

      console.log(`📊 Agency ${agency.id}: Meta: ${result.meta.synced} synced, ${result.meta.failed} failed`);
    } catch (error) {
      console.error(`❌ Error syncing for agency ${agency.id}:`, error);
    }
  }

  console.log(`✅ Ad metrics sync complete. Processed ${results.length} agencies.`);
  return results;
}