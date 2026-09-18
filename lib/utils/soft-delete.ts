// lib/utils/soft-delete.ts

import { prisma } from '@/lib/prisma';

export async function softDeleteAsset(assetId: string) {
  return await prisma.creativeAsset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });
}

export async function restoreAsset(assetId: string) {
  return await prisma.creativeAsset.update({
    where: { id: assetId },
    data: { deletedAt: null },
  });
}

export async function getActiveAssets(agencyId: string) {
  return await prisma.creativeAsset.findMany({
    where: {
      agencyId,
      deletedAt: null,
    },
  });
}

export async function getDeletedAssets(agencyId: string) {
  return await prisma.creativeAsset.findMany({
    where: {
      agencyId,
      deletedAt: { not: null },
    },
  });
}

export async function permanentlyDeleteAsset(assetId: string) {
  // First, delete all versions
  await prisma.creativeAssetVersion.deleteMany({
    where: { creativeAssetId: assetId },
  });
  
  // Then delete the asset
  return await prisma.creativeAsset.delete({
    where: { id: assetId },
  });
}