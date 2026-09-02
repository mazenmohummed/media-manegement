// lib/approval-gate.ts - Full implementation
import { prisma } from './prisma';

export interface ApprovalCheckResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
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
 */
export async function validateProductionAccess(
  conceptId: string,
  action: string
): Promise<void> {
  const result = await checkConceptApproval(conceptId);

  if (!result.canProceed) {
    throw new Error(
      `Cannot ${action}: Concept is not fully approved.\n\n${result.errors.join('\n')}`
    );
  }

  if (result.warnings.length > 0) {
    console.warn(`Production warnings for concept ${conceptId}:`, result.warnings);
  }
}

/**
 * Validate production access for a specific asset
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