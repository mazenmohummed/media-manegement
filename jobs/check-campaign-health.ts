// jobs/check-campaign-health.ts
import { CampaignHealthService } from '@/lib/services/campaign-health.service';
import { prisma } from '@/lib/prisma';

export async function checkCampaignHealthJob() {
  try {
    console.log('🔄 Running campaign health check...');

    // Get all agencies with active campaigns
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
        const healthService = new CampaignHealthService(agency.id);
        const result = await healthService.checkAllActiveCampaigns();
        
        if (result.breached > 0) {
          console.log(`📊 Agency ${agency.id}: ${result.breached} campaigns breached, ${result.tasksCreated} tasks created, ${result.tasksUpdated} updated`);
        }
        
        results.push({
          agencyId: agency.id,
          ...result,
        });
      } catch (error) {
        console.error(`❌ Error checking campaigns for agency ${agency.id}:`, error);
      }
    }

    console.log(`✅ Campaign health check complete. Checked ${results.reduce((sum, r) => sum + r.checked, 0)} campaigns across ${results.length} agencies.`);
    
    return results;
  } catch (error) {
    console.error('❌ Campaign health check failed:', error);
    throw error;
  }
}