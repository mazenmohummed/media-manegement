// app/api/tasks/[taskId]/production-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { getStageLabel, getProductionStages } from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProductionStageProgress {
  stage: string;
  label: string;
  total: number;
  approved: number;
  pending: number;
  revisions: number;
  rejected: number;
  percentage: number;
  isComplete: boolean;
  order: number;
}

interface ProductionStatusSummary {
  taskId: string;
  taskTitle: string | null;
  totalAssets: number;
  summary: {
    approved: number;
    pending: number;
    revisions: number;
    rejected: number;
    draft: number;
    inReview: number;
    completed: number;
  };
  stages: ProductionStageProgress[];
  overallProgress: {
    percentage: number;
    currentStage: string | null;
    currentStageLabel: string | null;
    nextStage: string | null;
    nextStageLabel: string | null;
    isComplete: boolean;
  };
  recentActivity: {
    assetId: string;
    assetName: string;
    action: string;
    timestamp: string;
  }[];
  versionStatusBreakdown: Record<string, number>;
  assetTypeBreakdown: Record<string, number>;
}

// ─── Helper Functions ──────────────────────────────────────────────────────

const getStatusWeight = (status: string): number => {
  const weights: Record<string, number> = {
    'APPROVED': 100,
    'CLIENT_REVIEW': 60,
    'INTERNAL_REVIEW': 50,
    'REVISIONS_REQUIRED': 30,
    'REJECTED': 10,
    'DRAFT': 20,
  };
  return weights[status] || 0;
};

const isComplete = (status: string): boolean => {
  return status === 'APPROVED';
};

const isInReview = (status: string): boolean => {
  return status === 'CLIENT_REVIEW' || status === 'INTERNAL_REVIEW';
};

const isPending = (status: string): boolean => {
  return status === 'DRAFT' || status === 'PENDING';
};

const isRevisions = (status: string): boolean => {
  return status === 'REVISIONS_REQUIRED';
};

const isRejected = (status: string): boolean => {
  return status === 'REJECTED';
};

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    // ─── 1. Fetch Task ─────────────────────────────────────────────────────
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        milestoneId: true,
        status: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── 2. Fetch Creative Assets ────────────────────────────────────────
    const creativeAssets = await prisma.creativeAsset.findMany({
      where: {
        taskId: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // ─── 3. Build Status Summary ──────────────────────────────────────────
    const totalAssets = creativeAssets.length;
    
    let approved = 0;
    let pending = 0;
    let revisions = 0;
    let rejected = 0;
    let draft = 0;
    let inReview = 0;
    let completed = 0;

    const versionStatusBreakdown: Record<string, number> = {};
    const assetTypeBreakdown: Record<string, number> = {};
    const stageMap: Record<string, { 
      total: number; 
      approved: number; 
      pending: number; 
      revisions: number; 
      rejected: number;
      assets: any[];
    }> = {};

    // ─── 4. Process Each Asset ────────────────────────────────────────────
    creativeAssets.forEach((asset) => {
    const latestVersion = asset.versions[0];
    const status = latestVersion?.status || 'DRAFT';
    const stage = asset.productionStage || 'unassigned';
    const type = asset.type || 'OTHER';

    // Track version status
    versionStatusBreakdown[status] = (versionStatusBreakdown[status] || 0) + 1;

    // Track asset type
    assetTypeBreakdown[type] = (assetTypeBreakdown[type] || 0) + 1;

    // Track stage progress
    if (!stageMap[stage]) {
        stageMap[stage] = { total: 0, approved: 0, pending: 0, revisions: 0, rejected: 0, assets: [] };
    }
    stageMap[stage].total++;
    stageMap[stage].assets.push(asset);

    // Count statuses - use direct checks
    if (status === 'APPROVED') {
        approved++;
        completed++;
        stageMap[stage].approved++;
    } else if (status === 'CLIENT_REVIEW' || status === 'INTERNAL_REVIEW') {
        pending++;
        inReview++;
        stageMap[stage].pending++;
    } else if (status === 'DRAFT') {
        pending++;
        draft++;
        stageMap[stage].pending++;
    } else if (status === 'REVISIONS_REQUIRED') {
        revisions++;
        stageMap[stage].revisions++;
    } else if (status === 'REJECTED') {
        rejected++;
        stageMap[stage].rejected++;
    }
    });

    // ─── 5. Build Stage Progress ─────────────────────────────────────────
    const allStages = getProductionStages();
    const stages: ProductionStageProgress[] = [];

    // Add actual stages from assets
    Object.entries(stageMap).forEach(([stageKey, data]) => {
      const stageLabel = stageKey === 'unassigned' ? 'Unassigned' : getStageLabel(stageKey);
      const stageOrder = allStages.find(s => s.value === stageKey)?.order ?? 999;
      
      const total = data.total;
      const approvedCount = data.approved;
      const completedCount = approvedCount;
      const percentage = total > 0 ? (approvedCount / total) * 100 : 0;
      const isCompleteStage = total > 0 && approvedCount === total;

      stages.push({
        stage: stageKey,
        label: stageLabel,
        total,
        approved: data.approved,
        pending: data.pending,
        revisions: data.revisions,
        rejected: data.rejected,
        percentage,
        isComplete: isCompleteStage,
        order: stageOrder,
      });
    });

    // Sort stages by order
    stages.sort((a, b) => a.order - b.order);

    // ─── 6. Calculate Overall Progress ────────────────────────────────────
    const totalAssetsCount = totalAssets;
    const completedAssets = approved;
    const overallPercentage = totalAssetsCount > 0 ? (completedAssets / totalAssetsCount) * 100 : 0;
    const isComplete = totalAssetsCount > 0 && completedAssets === totalAssetsCount;

    // Find current and next stage
    let currentStage = null;
    let currentStageLabel = null;
    let nextStage = null;
    let nextStageLabel = null;

    // Find first stage that is not complete
    for (const stage of stages) {
      if (!stage.isComplete && stage.total > 0) {
        currentStage = stage.stage;
        currentStageLabel = stage.label;
        // Find next stage after current
        const currentIndex = allStages.findIndex(s => s.value === stage.stage);
        if (currentIndex !== -1 && currentIndex < allStages.length - 1) {
          const next = allStages[currentIndex + 1];
          nextStage = next.value;
          nextStageLabel = next.label;
        }
        break;
      }
    }

    // If all stages complete, find the last stage
    if (!currentStage && isComplete) {
      const lastStage = stages[stages.length - 1];
      if (lastStage) {
        currentStage = lastStage.stage;
        currentStageLabel = lastStage.label;
      }
    }

    // ─── 7. Build Recent Activity ─────────────────────────────────────────
    const recentActivity = creativeAssets
      .filter(a => a.versions.length > 0)
      .map((asset) => {
        const latestVersion = asset.versions[0];
        const status = latestVersion?.status || 'DRAFT';
        let action = 'Created';
        
        if (status === 'APPROVED') action = 'Approved';
        else if (status === 'REVISIONS_REQUIRED') action = 'Revisions Requested';
        else if (status === 'REJECTED') action = 'Rejected';
        else if (status === 'CLIENT_REVIEW' || status === 'INTERNAL_REVIEW') action = 'In Review';
        
        return {
          assetId: asset.id,
          assetName: asset.name,
          action,
          timestamp: asset.updatedAt.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // ─── 8. Build Response ────────────────────────────────────────────────
    const response: ProductionStatusSummary = {
      taskId: task.id,
      taskTitle: task.title,
      totalAssets,
      summary: {
        approved,
        pending,
        revisions,
        rejected,
        draft,
        inReview,
        completed,
      },
      stages,
      overallProgress: {
        percentage: overallPercentage,
        currentStage,
        currentStageLabel,
        nextStage,
        nextStageLabel,
        isComplete,
      },
      recentActivity,
      versionStatusBreakdown,
      assetTypeBreakdown,
    };

    // ─── 9. Log Access ────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'VIEW',
        entityType: 'Task',
        entityId: taskId,
        message: `Production status viewed for task: ${task.title || task.id}`,
        metadata: {
          totalAssets,
          approved,
          pending,
          revisions,
          rejected,
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching production status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production status: ' + (error as Error).message },
      { status: 500 }
    );
  }
}