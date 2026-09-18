// lib/services/campaign-health.service.ts
import { prisma } from '@/lib/prisma';
import {
  DigitalCampaignStatus,
  TaskPriority,
  TaskStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';

export interface HealthThresholds {
  minCTR?: number;
  minROAS?: number;
  maxCPC?: number;
  minReach?: number;
  minConversions?: number;
}

export interface CampaignHealthStatus {
  campaignId: string;
  campaignName: string;
  platform: string;
  status: 'green' | 'amber' | 'red';
  metrics: {
    ctr: number;
    roas: number;
    cpc: number;
    reach: number;
    conversions: number;
    spend: number;
  };
  thresholds: HealthThresholds;
  breaches: string[];
  lastOptimizationTaskId?: string;
  optimizationTaskOpen: boolean;
}

export class CampaignHealthService {
  private agencyId: string;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async getAgencyThresholds(): Promise<HealthThresholds> {
    return {
      minCTR: 1.5,
      minROAS: 2.0,
      maxCPC: 5.0,
      minReach: 1000,
      minConversions: 10,
    };
  }

  async getCampaignThresholds(campaignId: string): Promise<HealthThresholds> {
    return this.getAgencyThresholds();
  }

  async checkCampaignHealth(
    campaignId: string
  ): Promise<CampaignHealthStatus | null> {
    const campaign = await prisma.digitalAdCampaign.findFirst({
      where: {
        id: campaignId,
        agencyId: this.agencyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        project: {
          include: {
            tasks: {
              where: {
                status: { in: ['PENDING', 'ACTIVE', 'IN_REVIEW'] },
                title: { contains: '[Optimization]' },
                deletedAt: null,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!campaign || campaign.metrics.length === 0) {
      return null;
    }

    const latestMetric = campaign.metrics[0];
    const thresholds = await this.getCampaignThresholds(campaignId);
    const breaches: string[] = [];
    let status: 'green' | 'amber' | 'red' = 'green';

    if (thresholds.minCTR && latestMetric.ctr < thresholds.minCTR) {
      breaches.push(
        `CTR (${latestMetric.ctr.toFixed(2)}%) below threshold (${thresholds.minCTR}%)`
      );
      status = 'amber';
    }

    if (thresholds.minROAS && latestMetric.roas < thresholds.minROAS) {
      breaches.push(
        `ROAS (${latestMetric.roas.toFixed(2)}x) below threshold (${thresholds.minROAS}x)`
      );
      status = 'amber';
    }

    if (thresholds.maxCPC && latestMetric.cpc > thresholds.maxCPC) {
      breaches.push(
        `CPC ($${latestMetric.cpc.toFixed(2)}) above threshold ($${thresholds.maxCPC})`
      );
      status = 'amber';
    }

    if (thresholds.minReach && latestMetric.reach < thresholds.minReach) {
      breaches.push(
        `Reach (${latestMetric.reach}) below threshold (${thresholds.minReach})`
      );
      status = 'amber';
    }

    if (
      thresholds.minConversions &&
      latestMetric.conversions < thresholds.minConversions
    ) {
      breaches.push(
        `Conversions (${latestMetric.conversions}) below threshold (${thresholds.minConversions})`
      );
      status = 'amber';
    }

    if (breaches.length >= 2) {
      status = 'red';
    }

    // ✅ Null-safe: project is optional on DigitalAdCampaign
    const projectTasks = campaign.project?.tasks ?? [];
    const hasOpenTask = projectTasks.length > 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      platform: campaign.platform,
      status,
      metrics: {
        ctr: latestMetric.ctr,
        roas: latestMetric.roas,
        cpc: latestMetric.cpc,
        reach: latestMetric.reach,
        conversions: latestMetric.conversions,
        spend: latestMetric.spend,
      },
      thresholds,
      breaches,
      lastOptimizationTaskId: projectTasks[0]?.id,
      optimizationTaskOpen: hasOpenTask,
    };
  }

  async checkAllActiveCampaigns(): Promise<{
    checked: number;
    breached: number;
    tasksCreated: number;
    tasksUpdated: number;
    results: CampaignHealthStatus[];
  }> {
    const activeCampaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        agencyId: this.agencyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    const results: CampaignHealthStatus[] = [];
    let breachedCount = 0;
    let tasksCreated = 0;
    let tasksUpdated = 0;

    for (const campaign of activeCampaigns) {
      if (campaign.metrics.length === 0) continue;

      const healthStatus = await this.checkCampaignHealth(campaign.id);
      if (!healthStatus) continue;

      results.push(healthStatus);

      if (healthStatus.breaches.length > 0) {
        breachedCount++;

        if (healthStatus.optimizationTaskOpen) {
          const updated = await this.updateOptimizationTask(
            campaign.id,
            healthStatus
          );
          if (updated) tasksUpdated++;
        } else {
          const created = await this.createOptimizationTask(
            campaign.id,
            healthStatus
          );
          if (created) tasksCreated++;
        }
      }
    }

    return {
      checked: activeCampaigns.length,
      breached: breachedCount,
      tasksCreated,
      tasksUpdated,
      results,
    };
  }

  async createOptimizationTask(
    campaignId: string,
    healthStatus: CampaignHealthStatus
  ): Promise<boolean> {
    try {
      const campaign = await prisma.digitalAdCampaign.findUnique({
        where: { id: campaignId },
        include: {
          project: {
            include: {
              tasks: {
                where: { deletedAt: null },
                take: 1,
              },
            },
          },
        },
      });

      if (!campaign) {
        console.error(`Campaign ${campaignId} not found`);
        return false;
      }

      // ✅ projectId is required on Task — bail if the campaign has no project
      if (!campaign.projectId) {
        console.warn(
          `Campaign ${campaignId} has no linked project; skipping optimization task creation.`
        );
        return false;
      }

      const potentialAssignees = await prisma.user.findMany({
        where: {
          agencyId: this.agencyId,
          isActive: true,
          role: { in: ['ADMIN', 'TEAMLEADER', 'OPERATOR'] },
        },
        take: 1,
      });

      const mediaBuyer = potentialAssignees[0] || null;

      const taskTitle = `[Optimization] Performance drop for ${campaign.name} on ${campaign.platform}`;
      const taskDescription = `
## Optimization Required

Campaign: ${campaign.name}
Platform: ${campaign.platform}
Date: ${new Date().toLocaleDateString()}

### Breaches Detected:
${healthStatus.breaches.map((b) => `- ${b}`).join('\n')}

### Current Metrics:
- CTR: ${healthStatus.metrics.ctr.toFixed(2)}%
- ROAS: ${healthStatus.metrics.roas.toFixed(2)}x
- CPC: $${healthStatus.metrics.cpc.toFixed(2)}
- Reach: ${healthStatus.metrics.reach.toLocaleString()}
- Conversions: ${healthStatus.metrics.conversions}
- Spend: $${healthStatus.metrics.spend.toFixed(2)}

### Recommended Actions:
1. Review targeting and audience segments
2. Check ad creative performance
3. Adjust bidding strategy
4. Review landing page experience

### Threshold Settings:
- Min CTR: ${healthStatus.thresholds.minCTR || 'N/A'}%
- Min ROAS: ${healthStatus.thresholds.minROAS || 'N/A'}x
- Max CPC: $${healthStatus.thresholds.maxCPC || 'N/A'}
`;

      const task = await prisma.task.create({
        data: {
          taskNo: `OPT-${Date.now()}`,
          taskType: 'optimization',
          title: taskTitle,
          description: taskDescription,
          priority: 'URGENT',
          status: 'PENDING',
          dueDate: new Date(),
          estimatedHours: 2,
          agencyId: this.agencyId,
          // ✅ narrowed to non-null by the guard above
          projectId: campaign.projectId,
        },
      });

      if (mediaBuyer) {
        await prisma.$executeRaw`
          INSERT INTO "_TaskAssignees" ("A", "B")
          VALUES (${task.id}, ${mediaBuyer.id})
          ON CONFLICT DO NOTHING
        `;
      }

      await prisma.comment.create({
        data: {
          text: `Auto-generated from campaign health check for "${campaign.name}" (${campaign.platform})`,
          taskId: task.id,
          projectId: campaign.projectId,
          agencyId: this.agencyId,
        },
      });

      await this.sendOptimizationNotifications(task, campaign, healthStatus);

      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'TASK',
          entityId: task.id,
          message: `Auto-created optimization task for campaign ${campaign.name}`,
          agencyId: this.agencyId,
          actorId: 'system',
          metadata: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: campaign.platform,
            breaches: healthStatus.breaches,
            metrics: healthStatus.metrics,
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Error creating optimization task:', error);
      return false;
    }
  }

  async updateOptimizationTask(
    campaignId: string,
    healthStatus: CampaignHealthStatus
  ): Promise<boolean> {
    try {
      const existingTask = await prisma.task.findFirst({
        where: {
          project: {
            digitalAdCampaigns: {
              some: { id: campaignId },
            },
          },
          title: { contains: '[Optimization]' },
          status: { in: ['PENDING', 'ACTIVE', 'IN_REVIEW'] },
          deletedAt: null,
        },
        include: {
          comments: {
            where: { deletedAt: null },
            take: 5,
          },
        },
      });

      if (!existingTask) return false;

      await prisma.comment.create({
        data: {
          text: `⚠️ Performance update (${new Date().toLocaleDateString()}):\n\n${healthStatus.breaches
            .map((b) => `- ${b}`)
            .join('\n')}\n\nCurrent Metrics:\n- CTR: ${healthStatus.metrics.ctr.toFixed(
            2
          )}%\n- ROAS: ${healthStatus.metrics.roas.toFixed(
            2
          )}x\n- CPC: $${healthStatus.metrics.cpc.toFixed(2)}`,
          taskId: existingTask.id,
          projectId: existingTask.projectId,
          agencyId: this.agencyId,
        },
      });

      if (healthStatus.status === 'red') {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: { priority: 'URGENT' },
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating optimization task:', error);
      return false;
    }
  }

  async sendOptimizationNotifications(
    task: any,
    campaign: any,
    healthStatus: CampaignHealthStatus
  ): Promise<void> {
    const assignees = await prisma.user.findMany({
      where: {
        agencyId: this.agencyId,
        isActive: true,
        role: { in: ['ADMIN', 'TEAMLEADER', 'OPERATOR'] },
      },
      take: 3,
    });

    for (const assignee of assignees) {
      await prisma.notification.create({
        data: {
          title: '⚠️ Optimization Task Created',
          message: `Auto-created optimization task for ${campaign.name} due to performance drop. Priority: URGENT, Due: Today.`,
          type: 'ALERT',
          userId: assignee.id,
          agencyId: this.agencyId,
          actionUrl: `/tasks/${task.id}`,
        },
      });
    }

    const teamLead = await prisma.user.findFirst({
      where: {
        agencyId: this.agencyId,
        role: 'TEAMLEADER',
        isActive: true,
      },
    });

    if (teamLead && !assignees.some((a) => a.id === teamLead.id)) {
      await prisma.notification.create({
        data: {
          title: '⚠️ Campaign Performance Alert',
          message: `${campaign.name} (${campaign.platform}) requires optimization. Task created for ${assignees
            .map((a) => a.name)
            .join(', ')}.`,
          type: 'ALERT',
          userId: teamLead.id,
          agencyId: this.agencyId,
          actionUrl: `/tasks/${task.id}`,
        },
      });
    }
  }

  async getHealthDashboard(): Promise<{
    summary: {
      total: number;
      green: number;
      amber: number;
      red: number;
      needsAttention: number;
    };
    campaigns: CampaignHealthStatus[];
  }> {
    const activeCampaigns = await prisma.digitalAdCampaign.findMany({
      where: {
        agencyId: this.agencyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    const campaignStatuses: CampaignHealthStatus[] = [];
    let green = 0;
    let amber = 0;
    let red = 0;

    for (const campaign of activeCampaigns) {
      if (campaign.metrics.length === 0) {
        campaignStatuses.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: campaign.platform,
          status: 'green',
          metrics: {
            ctr: 0,
            roas: 0,
            cpc: 0,
            reach: 0,
            conversions: 0,
            spend: 0,
          },
          thresholds: await this.getCampaignThresholds(campaign.id),
          breaches: [],
          optimizationTaskOpen: false,
        });
        green++;
        continue;
      }

      const healthStatus = await this.checkCampaignHealth(campaign.id);
      if (healthStatus) {
        campaignStatuses.push(healthStatus);
        if (healthStatus.status === 'green') green++;
        else if (healthStatus.status === 'amber') amber++;
        else if (healthStatus.status === 'red') red++;
      }
    }

    return {
      summary: {
        total: campaignStatuses.length,
        green,
        amber,
        red,
        needsAttention: amber + red,
      },
      campaigns: campaignStatuses,
    };
  }
}