// jobs/check-campaign-health-v2.ts (updated with 2-day rule)
import { CampaignHealthService } from '@/lib/services/campaign-health.service';
import { prisma } from '@/lib/prisma';

// ─── Helper to check for consecutive breaches ──────────────────────────

function checkConsecutiveBreaches(
  metrics: any[],
  thresholds: any
): boolean {
  if (metrics.length < 2) return false;

  // Check if the last 2 days both have breaches
  const hasBreach = (metric: any) => {
    const breaches: string[] = [];
    
    if (thresholds.minCTR && metric.ctr < thresholds.minCTR) {
      breaches.push('ctr');
    }
    if (thresholds.minROAS && metric.roas < thresholds.minROAS) {
      breaches.push('roas');
    }
    if (thresholds.maxCPC && metric.cpc > thresholds.maxCPC) {
      breaches.push('cpc');
    }
    if (thresholds.minReach && metric.reach < thresholds.minReach) {
      breaches.push('reach');
    }
    if (thresholds.minConversions && metric.conversions < thresholds.minConversions) {
      breaches.push('conversions');
    }

    return breaches.length > 0;
  };

  // Check today and yesterday
  const today = metrics[0];
  const yesterday = metrics[1];

  return hasBreach(today) && hasBreach(yesterday);
}

// ─── Main Job Function ──────────────────────────────────────────────────

export async function checkCampaignHealthV2Job() {
  console.log('🔄 Running campaign health check (v2)...');

  const agencies = await prisma.agency.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  const results = [];

  for (const agency of agencies) {
    try {
      const healthService = new CampaignHealthService(agency.id);
      
      // Get all active campaigns with their latest metrics
      const campaigns = await prisma.digitalAdCampaign.findMany({
        where: {
          agencyId: agency.id,
          deletedAt: null,
          status: 'ACTIVE',
        },
        include: {
          metrics: {
            orderBy: {
              date: 'desc',
            },
            take: 3, // Get last 3 days to check for consecutive breaches
          },
        },
      });

      const breachedCampaigns = [];

      for (const campaign of campaigns) {
        if (campaign.metrics.length < 2) continue; // Need at least 2 days of data

        const healthStatus = await healthService.checkCampaignHealth(campaign.id);
        if (!healthStatus || healthStatus.breaches.length === 0) continue;

        // Check if the breach has occurred for at least 2 consecutive days
        const hasConsecutiveBreach = checkConsecutiveBreaches(
          campaign.metrics,
          healthStatus.thresholds
        );

        if (hasConsecutiveBreach) {
          breachedCampaigns.push({
            campaign: campaign,
            healthStatus: healthStatus,
          });
        }
      }

      // Create tasks for campaigns with consecutive breaches
      let tasksCreated = 0;
      let tasksUpdated = 0;

      for (const breached of breachedCampaigns) {
        const existingTask = await prisma.task.findFirst({
          where: {
            project: {
              digitalAdCampaigns: {
                some: { id: breached.campaign.id },
              },
            },
            title: { contains: '[Optimization]' },
            status: { in: ['PENDING', 'ACTIVE', 'IN_REVIEW'] },
            deletedAt: null,
          },
        });

        if (existingTask) {
          await healthService.updateOptimizationTask(breached.campaign.id, breached.healthStatus);
          tasksUpdated++;
        } else {
          await healthService.createOptimizationTask(breached.campaign.id, breached.healthStatus);
          tasksCreated++;
        }
      }

      results.push({
        agencyId: agency.id,
        checked: campaigns.length,
        breached: breachedCampaigns.length,
        tasksCreated,
        tasksUpdated,
      });

      console.log(`📊 Agency ${agency.id}: ${breachedCampaigns.length} campaigns breached (${tasksCreated} tasks created, ${tasksUpdated} updated)`);
      
    } catch (error) {
      console.error(`❌ Error checking campaigns for agency ${agency.id}:`, error);
    }
  }

  console.log(`✅ Campaign health check complete. Processed ${results.length} agencies.`);
  return results;
}