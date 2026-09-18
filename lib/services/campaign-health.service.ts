// lib/services/campaign-health.service.ts
import { prisma } from '@/lib/prisma';
import { DigitalCampaignStatus, TaskPriority, TaskStatus, NotificationType, UserRole } from '@prisma/client';

export interface HealthThresholds {
  minCTR?: number; // Minimum acceptable CTR (as percentage, e.g., 2 = 2%)
  minROAS?: number; // Minimum acceptable ROAS (e.g., 2 = 2x return)
  maxCPC?: number; // Maximum acceptable CPC
  minReach?: number; // Minimum daily reach
  minConversions?: number; // Minimum daily conversions
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

  /**
   * Get or create agency-wide default thresholds
   */
  async getAgencyThresholds(): Promise<HealthThresholds> {
    // Check if agency has custom thresholds stored in settings
    // For now, return defaults
    return {
      minCTR: 1.5,
      minROAS: 2.0,
      maxCPC: 5.0,
      minReach: 1000,
      minConversions: 10,
    };
  }

  /**
   * Get thresholds for a specific campaign (campaign-specific overrides)
   */
  async getCampaignThresholds(campaignId: string): Promise<HealthThresholds> {
    // Check if campaign has custom thresholds stored in metadata
    // For now, return agency defaults
    return this.getAgencyThresholds();
  }

  /**
   * Check health of a single campaign
   */
  async checkCampaignHealth(campaignId: string): Promise<CampaignHealthStatus | null> {
    const campaign = await prisma.digitalAdCampaign.findUnique({
      where: {
        id: campaignId,
        agencyId: this.agencyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        metrics: {
          orderBy: {
            date: 'desc',
          },
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

    // Check each threshold
    if (thresholds.minCTR && latestMetric.ctr < thresholds.minCTR) {
      breaches.push(`CTR (${latestMetric.ctr.toFixed(2)}%) below threshold (${thresholds.minCTR}%)`);
      status = 'amber';
    }

    if (thresholds.minROAS && latestMetric.roas < thresholds.minROAS) {
      breaches.push(`ROAS (${latestMetric.roas.toFixed(2)}x) below threshold (${thresholds.minROAS}x)`);
      status = 'amber';
    }

    if (thresholds.maxCPC && latestMetric.cpc > thresholds.maxCPC) {
      breaches.push(`CPC ($${latestMetric.cpc.toFixed(2)}) above threshold ($${thresholds.maxCPC})`);
      status = 'amber';
    }

    if (thresholds.minReach && latestMetric.reach < thresholds.minReach) {
      breaches.push(`Reach (${latestMetric.reach}) below threshold (${thresholds.minReach})`);
      status = 'amber';
    }

    if (thresholds.minConversions && latestMetric.conversions < thresholds.minConversions) {
      breaches.push(`Conversions (${latestMetric.conversions}) below threshold (${thresholds.minConversions})`);
      status = 'amber';
    }

    // If there are 2+ breaches, escalate to red
    if (breaches.length >= 2) {
      status = 'red';
    }

    // Check if there's an existing optimization task
    const hasOpenTask = campaign.project.tasks.length > 0;

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
      lastOptimizationTaskId: campaign.project.tasks[0]?.id,
      optimizationTaskOpen: hasOpenTask,
    };
  }

  /**
   * Check all active campaigns and create optimization tasks where needed
   */
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
          orderBy: {
            date: 'desc',
          },
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
          // Update existing task
          const updated = await this.updateOptimizationTask(campaign.id, healthStatus);
          if (updated) tasksUpdated++;
        } else {
          // Create new task
          const created = await this.createOptimizationTask(campaign.id, healthStatus);
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

  /**
   * Create an optimization task for a breached campaign
   */
  async createOptimizationTask(campaignId: string, healthStatus: CampaignHealthStatus): Promise<boolean> {
    try {
      // First, get the campaign with its project and related users
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

      // Find media buyer from users with appropriate roles
      // Get all users in the agency with media buying roles
      const potentialAssignees = await prisma.user.findMany({
        where: {
          agencyId: this.agencyId,
          isActive: true,
          role: { in: ['ADMIN', 'TEAMLEADER', 'OPERATOR'] },
        },
        take: 1,
      });

      const mediaBuyer = potentialAssignees[0] || null;

      const breachDescriptions = healthStatus.breaches.join('\n');
      const taskTitle = `[Optimization] Performance drop for ${campaign.name} on ${campaign.platform}`;
      const taskDescription = `
## Optimization Required

Campaign: ${campaign.name}
Platform: ${campaign.platform}
Date: ${new Date().toLocaleDateString()}

### Breaches Detected:
${healthStatus.breaches.map(b => `- ${b}`).join('\n')}

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

      // Create the optimization task
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
          projectId: campaign.projectId,
        },
      });

      // If we have a media buyer, assign them to the task
      if (mediaBuyer) {
        // Check if TaskAssignees relation exists
        await prisma.$executeRaw`
          INSERT INTO "_TaskAssignees" ("A", "B")
          VALUES (${task.id}, ${mediaBuyer.id})
          ON CONFLICT DO NOTHING
        `;
      }

      // Create a comment linking the task to the campaign
      await prisma.comment.create({
        data: {
          text: `Auto-generated from campaign health check for "${campaign.name}" (${campaign.platform})`,
          taskId: task.id,
          projectId: campaign.projectId,
          agencyId: this.agencyId,
        },
      });

      // Send notifications
      await this.sendOptimizationNotifications(task, campaign, healthStatus);

      // Log audit
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

  /**
   * Update an existing optimization task with new breach information
   */
  async updateOptimizationTask(campaignId: string, healthStatus: CampaignHealthStatus): Promise<boolean> {
    try {
      // Find existing optimization task
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

      // Add a comment with updated metrics
      await prisma.comment.create({
        data: {
          text: `⚠️ Performance update (${new Date().toLocaleDateString()}):\n\n${healthStatus.breaches.map(b => `- ${b}`).join('\n')}\n\nCurrent Metrics:\n- CTR: ${healthStatus.metrics.ctr.toFixed(2)}%\n- ROAS: ${healthStatus.metrics.roas.toFixed(2)}x\n- CPC: $${healthStatus.metrics.cpc.toFixed(2)}`,
          taskId: existingTask.id,
          projectId: existingTask.projectId,
          agencyId: this.agencyId,
        },
      });

      // Update task priority if status is red
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

  /**
   * Send notifications for optimization task
   */
  async sendOptimizationNotifications(task: any, campaign: any, healthStatus: CampaignHealthStatus): Promise<void> {
    // Get assignees for this task
    const assignees = await prisma.user.findMany({
      where: {
        agencyId: this.agencyId,
        isActive: true,
        role: { in: ['ADMIN', 'TEAMLEADER', 'OPERATOR'] },
      },
      take: 3,
    });
    
    // Notify assignees
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

    // Notify team lead (if different from assignees)
    const teamLead = await prisma.user.findFirst({
      where: {
        agencyId: this.agencyId,
        role: 'TEAMLEADER',
        isActive: true,
      },
    });

    if (teamLead && !assignees.some((a: any) => a.id === teamLead.id)) {
      await prisma.notification.create({
        data: {
          title: '⚠️ Campaign Performance Alert',
          message: `${campaign.name} (${campaign.platform}) requires optimization. Task created for ${assignees.map((a: any) => a.name).join(', ')}.`,
          type: 'ALERT',
          userId: teamLead.id,
          agencyId: this.agencyId,
          actionUrl: `/tasks/${task.id}`,
        },
      });
    }
  }

  /**
   * Get health dashboard data for all active campaigns
   */
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
          orderBy: {
            date: 'desc',
          },
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
        // No metrics yet - treat as unknown/green
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