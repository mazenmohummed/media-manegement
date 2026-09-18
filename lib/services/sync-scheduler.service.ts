// lib/services/sync-scheduler.service.ts
import { prisma } from '@/lib/prisma';
import { MetaMarketingService } from './ad-platform/meta.service';
import { GoogleAdsService } from './ad-platform/google-ads.service';

export class SyncSchedulerService {
  private agencyId: string;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  /**
   * Sync all active campaigns for all platforms
   */
  async syncAll(): Promise<{
    meta: { synced: number; failed: number; errors: string[] };
    google: { synced: number; failed: number; errors: string[] };
  }> {
    const results = {
      meta: { synced: 0, failed: 0, errors: [] as string[] },
      google: { synced: 0, failed: 0, errors: [] as string[] },
    };

    // Sync Meta campaigns
    try {
      const metaService = new MetaMarketingService(this.agencyId);
      const metaResult = await metaService.syncAllCampaigns();
      results.meta = metaResult;
    } catch (error) {
      results.meta.errors.push(
        `Meta sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      results.meta.failed = -1;
    }

    // Sync Google campaigns
    try {
      const googleService = new GoogleAdsService(this.agencyId);
      // Google sync would be implemented similarly
      // For now, we'll skip as it requires more setup
    } catch (error) {
      results.google.errors.push(
        `Google sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      results.google.failed = -1;
    }

    return results;
  }
}