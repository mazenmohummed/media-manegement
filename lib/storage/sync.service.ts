// lib/storage/sync.service.ts
import { prisma } from '@/lib/prisma';
import { CloudStorageService } from './cloud-storage.service';
import fs from 'fs/promises';

export class SyncService {
  private cloudStorage: CloudStorageService;

  constructor(cloudStorage: CloudStorageService) {
    this.cloudStorage = cloudStorage;
  }

  // ✅ Sync all files for an agency
  async syncAgencyFiles(agencyId: string) {
    const activeProjects = await this.getActiveProjects(agencyId);
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const project of activeProjects) {
      const versionsToSync = await prisma.creativeAssetVersion.findMany({
        where: {
          creativeAssetId: project.id,
          isSyncedToCloud: false,
          status: {
            in: ['CLIENT_REVIEW', 'APPROVED']
          }
        }
      });

      for (const version of versionsToSync) {
        try {
          await this.syncVersionToCloud(version.id);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync version ${version.id}:`, error);
          failedCount++;
        }
      }
    }

    return { syncedCount, failedCount };
  }

  // ✅ NEW: Sync specific asset versions
  async syncAssetVersions(assetId: string) {
    // First, find the asset to get agency info
    const asset = await prisma.creativeAsset.findUnique({
      where: { id: assetId },
      include: {
        versions: {
          where: {
            isSyncedToCloud: false,
            status: {
              in: ['DRAFT', 'CLIENT_REVIEW', 'APPROVED']
            }
          }
        }
      }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const version of asset.versions) {
      try {
        await this.syncVersionToCloud(version.id);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync version ${version.id}:`, error);
        failedCount++;
      }
    }

    // Update asset sync status
    await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        syncStatus: syncedCount > 0 ? 'SYNCED' : 'NOT_SYNCED',
        isSynced: syncedCount > 0,
        syncedAt: syncedCount > 0 ? new Date() : null,
      }
    });

    return { 
      syncedCount, 
      failedCount,
      totalVersions: asset.versions.length
    };
  }

  // ✅ Sync a single version to cloud
  async syncVersionToCloud(versionId: string) {
    const version = await prisma.creativeAssetVersion.findUnique({
      where: { id: versionId },
      include: { 
        creativeAsset: true,
        agency: true
      }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    if (!version.localFileUrl) {
      throw new Error('No local file found for this version');
    }

    // Read from local storage
    const fileContent = await fs.readFile(version.localFileUrl);
    
    // Check cloud quota
    const agency = await prisma.agency.findUnique({
      where: { id: version.agencyId }
    });

    if (!agency) throw new Error('Agency not found');

    const cloudUsage = await this.getCloudUsage(version.agencyId);
    const fileSizeInBytes = fileContent.length;
    
    if (cloudUsage + fileSizeInBytes > Number(agency.cloudStorageQuota)) {
      throw new Error('Cloud storage quota exceeded');
    }

    // Upload to cloud
    const cloudKey = `${agency.id}/${version.creativeAssetId}/v${version.versionNo}`;
    const cloudUrl = await this.cloudStorage.upload(
      fileContent, 
      cloudKey,
      'application/octet-stream'
    );

    // Update database
    await prisma.creativeAssetVersion.update({
      where: { id: version.id },
      data: {
        cloudFileUrl: cloudUrl,
        isSyncedToCloud: true,
        syncedAt: new Date(),
        primaryStorage: 'BOTH'
      }
    });

    // Update agency storage usage
    await prisma.agency.update({
      where: { id: version.agencyId },
      data: {
        storageUsed: {
          increment: fileSizeInBytes
        }
      }
    });

    // Update asset sync status
    await prisma.creativeAsset.update({
      where: { id: version.creativeAssetId },
      data: {
        isSynced: true,
        syncStatus: 'SYNCED',
        syncedAt: new Date(),
      }
    });

    return { 
      versionId, 
      cloudUrl,
      fileSize: fileSizeInBytes
    };
  }

  // ✅ Get sync status for an asset
  async getAssetSyncStatus(assetId: string) {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id: assetId },
      include: {
        versions: {
          select: {
            id: true,
            versionNo: true,
            isSyncedToCloud: true,
            cloudFileUrl: true,
            status: true
          }
        }
      }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const totalVersions = asset.versions.length;
    const syncedVersions = asset.versions.filter(v => v.isSyncedToCloud).length;

    return {
      assetId: asset.id,
      assetName: asset.name,
      totalVersions,
      syncedVersions,
      syncPercentage: totalVersions > 0 ? (syncedVersions / totalVersions) * 100 : 0,
      isFullySynced: totalVersions === syncedVersions,
      syncStatus: asset.syncStatus,
      versions: asset.versions.map(v => ({
        versionNo: v.versionNo,
        isSynced: v.isSyncedToCloud,
        status: v.status,
        cloudUrl: v.cloudFileUrl
      }))
    };
  }

  private async getActiveProjects(agencyId: string) {
    return await prisma.creativeAsset.findMany({
      where: {
        agencyId,
        OR: [
          { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { versions: { some: { status: 'CLIENT_REVIEW' } } }
        ]
      }
    });
  }

  private async getCloudUsage(agencyId: string): Promise<number> {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { storageUsed: true }
    });
    return Number(agency?.storageUsed || 0);
  }
}