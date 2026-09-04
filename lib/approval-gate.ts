// lib/approval-gate.ts - Updated with better error handling
import { prisma } from './prisma';

export interface ApprovalCheckResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
}

export interface AssetApprovalStatus {
  assetId: string;
  assetName: string;
  status: string;
  versionNo: number;
  feedback: string | null;
}

/**
 * Check if a concept is fully approved before allowing production
 */
export async function checkConceptApproval(
  conceptId: string
): Promise<ApprovalCheckResult> {
  const result: ApprovalCheckResult = {
    canProceed: true,
    errors: [],
    warnings: [],
  };

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
    include: {
      assets: {
        include: {
          versions: {
            orderBy: { versionNo: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!concept) {
    result.canProceed = false;
    result.errors.push('Concept not found');
    return result;
  }

  if (concept.status !== 'APPROVED') {
    result.canProceed = false;
    result.errors.push('Concept must be approved before production can begin');
  }

  // Check each asset
  for (const asset of concept.assets) {
    const latestVersion = asset.versions[0];
    if (!latestVersion) {
      result.canProceed = false;
      result.errors.push(`Asset "${asset.name}" has no versions`);
      continue;
    }

    if (latestVersion.status !== 'APPROVED') {
      result.canProceed = false;
      result.errors.push(
        `Asset "${asset.name}" (v${latestVersion.versionNo}) is not approved. Current status: ${latestVersion.status}`
      );
    }

    // Check for any pending revisions
    const pendingRevisions = await prisma.reviewLinkAssetApproval.findFirst({
      where: {
        creativeAssetId: asset.id,
        status: { in: ['REJECTED', 'REVISIONS_REQUESTED'] },
        revisionTaskId: { not: null },
        revisionTask: {
          status: { not: 'COMPLETED' },
        },
      },
    });

    if (pendingRevisions) {
      result.canProceed = false;
      result.errors.push(
        `Asset "${asset.name}" has pending revisions that are not yet completed`
      );
    }
  }

  // Check for any review links that haven't been reviewed
  const unreviewedLinks = await prisma.reviewLink.findFirst({
    where: {
      conceptId,
      isActive: true,
      reviewedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (unreviewedLinks) {
    result.warnings.push(
      'There is an active review link that hasn\'t been reviewed yet'
    );
  }

  return result;
}

/**
 * Block production actions if concept is not approved
 * Throws an error with detailed message
 */
export async function validateProductionAccess(
  conceptId: string,
  action: string
): Promise<void> {
  const result = await checkConceptApproval(conceptId);

  if (!result.canProceed) {
    const errorMessage = [
      `Cannot ${action}: Concept is not fully approved.`,
      '',
      ...result.errors,
      '',
      'Please address all issues before proceeding.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  if (result.warnings.length > 0) {
    console.warn(`Production warnings for concept ${conceptId}:`, result.warnings);
  }
}

/**
 * Validate production access for a specific asset
 * Throws an error with detailed message
 */
export async function validateAssetProductionAccess(
  assetId: string,
  action: string
): Promise<void> {
  const asset = await prisma.creativeAsset.findUnique({
    where: { id: assetId },
    include: {
      concept: true,
      versions: {
        orderBy: { versionNo: 'desc' },
        take: 1,
      },
    },
  });

  if (!asset) {
    throw new Error(`Asset not found`);
  }

  // Check if the asset itself is approved
  const latestVersion = asset.versions[0];
  if (!latestVersion) {
    throw new Error(`Asset "${asset.name}" has no versions`);
  }

  if (latestVersion.status !== 'APPROVED') {
    throw new Error(
      `Cannot ${action}: Asset "${asset.name}" (v${latestVersion.versionNo}) is not approved. Current status: ${latestVersion.status}`
    );
  }

  // Also check the concept
  await validateProductionAccess(asset.conceptId, action);
}

/**
 * Get detailed approval status for a concept
 */
export async function getDetailedApprovalStatus(
  conceptId: string
): Promise<{
  status: ApprovalCheckResult;
  assets: AssetApprovalStatus[];
  summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}> {
  const status = await checkConceptApproval(conceptId);

  const assets = await prisma.creativeAsset.findMany({
    where: { conceptId },
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        take: 1,
      },
    },
  });

  const assetStatuses: AssetApprovalStatus[] = assets.map((asset) => ({
    assetId: asset.id,
    assetName: asset.name,
    status: asset.versions[0]?.status || 'DRAFT',
    versionNo: asset.versions[0]?.versionNo || 0,
    feedback: asset.versions[0]?.feedback || null,
  }));

  const summary = {
    total: assets.length,
    approved: assets.filter((a) => a.versions[0]?.status === 'APPROVED').length,
    pending: assets.filter(
      (a) =>
        a.versions[0]?.status === 'CLIENT_REVIEW' ||
        a.versions[0]?.status === 'INTERNAL_REVIEW' ||
        a.versions[0]?.status === 'DRAFT'
    ).length,
    rejected: assets.filter(
      (a) =>
        a.versions[0]?.status === 'REJECTED' ||
        a.versions[0]?.status === 'REVISIONS_REQUIRED'
    ).length,
  };

  return {
    status,
    assets: assetStatuses,
    summary,
  };
}