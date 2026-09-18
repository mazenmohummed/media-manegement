// app/api/projects/[projectId]/production/batch-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { 
  getProductionStages, 
  validateAssetTypeForStage,
  getStageConfig,
  canAssetTransition,
} from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BatchUpdateRequest {
  // Filter criteria
  filter: {
    stage?: string;           // Current production stage to filter
    milestoneId?: string;     // Milestone to filter
    conceptId?: string;       // Concept to filter
    assetType?: string;       // Asset type to filter
    status?: string;          // Version status to filter
    includeAllAssets?: boolean; // If true, update all matching assets
  };
  
  // Update data
  update: {
    targetStage: string;      // New production stage
    options?: {
      preserveMetadata?: boolean;   // Keep existing metadata
      createVersion?: boolean;      // Create a new version on stage change
      notifyAssignees?: boolean;    // Send notifications
      updateMilestone?: string;     // Move to a different milestone
    };
  };
  
  // Confirmation
  confirm?: boolean;
}

interface BatchUpdateResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    updated: number;
    skipped: number;
    failed: number;
    details: {
      updated: string[];
      skipped: string[];
      failed: { id: string; error: string }[];
    };
  };
  changes?: {
    assetId: string;
    assetName: string;
    fromStage: string;
    toStage: string;
    versionCreated?: string;
  }[];
}

// ─── Helper Functions ──────────────────────────────────────────────────────

const validateStageTransition = (
  assetType: string,
  fromStage: string | null,
  toStage: string
): { valid: boolean; error?: string } => {
  // If no current stage, any stage is allowed
  if (!fromStage) {
    const config = getStageConfig(toStage);
    if (!config) {
      return { valid: false, error: `Invalid target stage: ${toStage}` };
    }
    if (!validateAssetTypeForStage(assetType, toStage)) {
      return { 
        valid: false, 
        error: `Asset type "${assetType}" is not allowed in stage "${config.label}"` 
      };
    }
    return { valid: true };
  }

  // Check if transition is valid
  const transition = canAssetTransition(assetType, fromStage, toStage);
  if (!transition.canTransition) {
    return { valid: false, error: transition.reason || 'Invalid stage transition' };
  }

  return { valid: true };
};

// ─── GET Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/projects/[projectId]/production/batch-update
 * 
 * Get assets eligible for batch update
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const url = new URL(req.url);
    const stage = url.searchParams.get('stage');
    const milestoneId = url.searchParams.get('milestoneId');
    const conceptId = url.searchParams.get('conceptId');

    // ─── Build filter ──────────────────────────────────────────────────────
    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
      concept: {
        projectId: projectId,
      },
    };

    if (stage) {
      where.productionStage = stage;
    }

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    if (conceptId) {
      where.conceptId = conceptId;
    }

    // ─── Fetch assets ──────────────────────────────────────────────────────
    const assets = await prisma.creativeAsset.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // ─── Get stage configs ────────────────────────────────────────────────
    const stages = getProductionStages();
    const stageConfigs = Object.fromEntries(
      stages.map(s => [s.value, s])
    );

    // ─── Transform response ───────────────────────────────────────────────
    const transformedAssets = assets.map((asset) => {
      const latestVersion = asset.versions[0];
      const currentStage = asset.productionStage;
      const stageInfo = currentStage ? stageConfigs[currentStage] : null;
      
      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        currentStage: currentStage,
        currentStageLabel: stageInfo?.label || 'Unassigned',
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          versionNo: latestVersion.versionNo,
          status: latestVersion.status,
        } : null,
        task: asset.task ? {
          id: asset.task.id,
          title: asset.task.title,
        } : null,
        milestone: asset.milestone ? {
          id: asset.milestone.id,
          name: asset.milestone.name,
        } : null,
        concept: asset.concept ? {
          id: asset.concept.id,
          name: asset.concept.name,
        } : null,
        tags: asset.tags,
        createdAt: asset.createdAt,
      };
    });

    // ─── Get available stages ─────────────────────────────────────────────
    const availableStages = stages.map(s => ({
      value: s.value,
      label: s.label,
      description: s.description,
      order: s.order,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total: assets.length,
        byStage: Object.fromEntries(
          Object.entries(
            assets.reduce((acc, a) => {
              const stage = a.productionStage || 'unassigned';
              acc[stage] = (acc[stage] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          )
        ),
        byType: Object.fromEntries(
          Object.entries(
            assets.reduce((acc, a) => {
              acc[a.type] = (acc[a.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          )
        ),
      },
      assets: transformedAssets,
      availableStages,
      filter: {
        stage,
        milestoneId,
        conceptId,
      },
    });

  } catch (error) {
    console.error('Error fetching batch update candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch update candidates: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── PATCH Handler ──────────────────────────────────────────────────────────

/**
 * PATCH /api/projects/[projectId]/production/batch-update
 * 
 * Update production stage for multiple assets at once
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Store agencyId as a non-nullable string
    const agencyId = session.user.agencyId;

    const { projectId } = await params;
    const body: BatchUpdateRequest = await req.json();
    const { filter, update, confirm } = body;

    // ─── Validate request ──────────────────────────────────────────────────
    if (!filter) {
      return NextResponse.json(
        { error: 'Filter criteria are required' },
        { status: 400 }
      );
    }

    if (!update?.targetStage) {
      return NextResponse.json(
        { error: 'Target stage is required' },
        { status: 400 }
      );
    }

    // Validate target stage exists
    const targetStageConfig = getStageConfig(update.targetStage);
    if (!targetStageConfig) {
      return NextResponse.json(
        { error: `Invalid target stage: ${update.targetStage}` },
        { status: 400 }
      );
    }

    // Require confirmation for bulk operations
    if (!confirm) {
      return NextResponse.json(
        { 
          error: 'Confirmation required for batch update',
          details: `This will update all assets matching the filter criteria to stage "${targetStageConfig.label}". Please confirm with confirm: true.`,
        },
        { status: 400 }
      );
    }

    // ─── Build filter ──────────────────────────────────────────────────────
    const where: any = {
      agencyId: agencyId,
      deletedAt: null,
      concept: {
        projectId: projectId,
      },
    };

    if (filter.stage) {
      where.productionStage = filter.stage;
    }

    if (filter.milestoneId) {
      where.milestoneId = filter.milestoneId;
    }

    if (filter.conceptId) {
      where.conceptId = filter.conceptId;
    }

    if (filter.assetType) {
      where.type = filter.assetType;
    }

    if (filter.status && filter.status !== 'all') {
      where.versions = {
        some: {
          status: filter.status,
        },
      };
    }

    // ─── Fetch assets to update ───────────────────────────────────────────
    const assets = await prisma.creativeAsset.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assets found matching the filter criteria',
        stats: {
          total: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          details: {
            updated: [],
            skipped: [],
            failed: [],
          },
        },
      });
    }

    // ─── Validate each asset for the transition ───────────────────────────
    const validAssets: typeof assets = [];
    const invalidAssets: { asset: typeof assets[0]; error: string }[] = [];

    for (const asset of assets) {
      const validation = validateStageTransition(
        asset.type,
        asset.productionStage,
        update.targetStage
      );

      if (validation.valid) {
        validAssets.push(asset);
      } else {
        invalidAssets.push({
          asset,
          error: validation.error || 'Invalid transition',
        });
      }
    }

    // ─── If no valid assets, return error ────────────────────────────────
    if (validAssets.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No assets can be updated to the target stage',
        stats: {
          total: assets.length,
          updated: 0,
          skipped: invalidAssets.length,
          failed: 0,
          details: {
            updated: [],
            skipped: invalidAssets.map(a => a.asset.id),
            failed: [],
          },
        },
        errors: invalidAssets.map(a => ({
          assetId: a.asset.id,
          assetName: a.asset.name,
          error: a.error,
        })),
      }, { status: 400 });
    }

    // ─── Perform updates ──────────────────────────────────────────────────
    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: { id: string; error: string }[] = [];
    const changes: BatchUpdateResult['changes'] = [];

    for (const asset of validAssets) {
      try {
        const fromStage = asset.productionStage;

        // ─── Prepare update data ──────────────────────────────────────────
        const updateData: any = {
          productionStage: update.targetStage,
        };

        // Update milestone if specified
        if (update.options?.updateMilestone) {
          updateData.milestoneId = update.options.updateMilestone;
        }

        // Preserve metadata if option is set
        if (!update.options?.preserveMetadata) {
          // Optionally update metadata to reflect stage change
          const metadata = asset.productionMetadata as any || {};
          updateData.productionMetadata = {
            ...metadata,
            stageChangedAt: new Date().toISOString(),
            previousStage: fromStage,
          };
        }

        // ─── Create new version if option is set ──────────────────────────
        let versionCreated = null;
        if (update.options?.createVersion && asset.versions.length > 0) {
          const latestVersion = asset.versions[0];
          const nextVersionNo = (latestVersion?.versionNo || 0) + 1;
          
          // Copy the latest version file
          const newVersion = await prisma.creativeAssetVersion.create({
            data: {
              versionNo: nextVersionNo,
              creativeAssetId: asset.id,
              agencyId: agencyId,
              status: 'DRAFT',
              fileUrl: latestVersion?.fileUrl || null,
              localFileUrl: latestVersion?.localFileUrl || null,
              cloudFileUrl: latestVersion?.cloudFileUrl || null,
              fileSize: latestVersion?.fileSize || null,
              mimeType: latestVersion?.mimeType || null,
              duration: latestVersion?.duration || null,
              resolution: latestVersion?.resolution || null,
              feedback: `Stage changed from ${fromStage || 'unassigned'} to ${update.targetStage}`,
              processingStatus: 'completed',
              processedAt: new Date(),
              thumbnailUrl: latestVersion?.thumbnailUrl || null,
            },
          });
          
          versionCreated = newVersion.id;
          updateData.versions = {
            connect: { id: newVersion.id },
          };
        }

        // ─── Update asset ──────────────────────────────────────────────────
        await prisma.creativeAsset.update({
          where: { id: asset.id },
          data: updateData,
        });

        updated.push(asset.id);
        changes.push({
          assetId: asset.id,
          assetName: asset.name,
          fromStage: fromStage || 'unassigned',
          toStage: update.targetStage,
          versionCreated: versionCreated || undefined,
        });

      } catch (error: any) {
        failed.push({
          id: asset.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // ─── Create notifications ─────────────────────────────────────────────
    if (update.options?.notifyAssignees !== false && updated.length > 0) {
      // Find users assigned to tasks with updated assets
      const taskIds = assets
        .filter(a => a.taskId)
        .map(a => a.taskId)
        .filter((id): id is string => id !== null);

      if (taskIds.length > 0) {
        const assignees = await prisma.user.findMany({
          where: {
            tasks: {
              some: {
                id: { in: taskIds },
              },
            },
            agencyId: agencyId,
          },
          select: {
            id: true,
          },
        });

        const stageLabel = targetStageConfig.label;
        
        if (assignees.length > 0) {
          await Promise.all(
            assignees.map((assignee) =>
              prisma.notification.create({
                data: {
                  title: 'Production Stage Updated',
                  message: `${updated.length} asset(s) moved to "${stageLabel}" stage in project ${projectId}`,
                  type: 'SUCCESS',
                  actionUrl: `/dashboard/projects/${projectId}`,
                  userId: assignee.id,
                  agencyId: agencyId, // ✅ Use the non-nullable variable
                },
              })
            )
          );
        }
      }
    }

    // ─── Log the batch update ─────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Project',
        entityId: projectId,
        message: `Batch production stage update: ${updated.length} assets moved to ${targetStageConfig.label}`,
        metadata: {
          filter,
          targetStage: update.targetStage,
          total: assets.length,
          updated: updated.length,
          skipped: skipped.length,
          failed: failed.length,
          assetIds: updated,
        },
        agencyId: agencyId, // ✅ Use the non-nullable variable
        actorId: session.user.id || 'system',
      },
    });

    // ─── Return result ────────────────────────────────────────────────────
    const result: BatchUpdateResult = {
      success: failed.length === 0,
      message: failed.length === 0
        ? `Successfully updated ${updated.length} assets to "${targetStageConfig.label}"`
        : `Updated ${updated.length} assets with ${failed.length} failures`,
      stats: {
        total: assets.length,
        updated: updated.length,
        skipped: invalidAssets.length + skipped.length,
        failed: failed.length,
        details: {
          updated,
          skipped: [...invalidAssets.map(a => a.asset.id), ...skipped],
          failed,
        },
      },
      changes,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error performing batch update:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch update: ' + (error as Error).message },
      { status: 500 }
    );
  }
}