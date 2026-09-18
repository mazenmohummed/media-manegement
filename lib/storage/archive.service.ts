// lib/storage/archive.service.ts
import { prisma } from '@/lib/prisma';
import { CloudStorageService } from './cloud-storage.service';
import { SyncStatus } from '@prisma/client';

export class ArchiveService {
  private cloudStorage: CloudStorageService;

  constructor(cloudStorage: CloudStorageService) {
    this.cloudStorage = cloudStorage;
  }

  async archiveOldProjects(agencyId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const oldProjects = await prisma.creativeAsset.findMany({
    where: {
      agencyId,
      updatedAt: { lt: ninetyDaysAgo },
      versions: {
        some: { isSyncedToCloud: true },
      },
    },
    include: {
      versions: {
        where: { isSyncedToCloud: true },
      },
    },
  });

  let archivedVersionCount = 0;

  for (const project of oldProjects) {
    for (const version of project.versions) {
      if (version.cloudFileUrl) {
        try {
          // ✅ `deleteFile(key)` expects an S3 key, not a URL.
          // Extract the key from the URL.
          const key = version.cloudFileUrl.replace(/^https?:\/\/[^/]+\//, '');
          await this.cloudStorage.deleteFile(key);
          archivedVersionCount++;
        } catch (error) {
          console.error(`Failed to delete ${version.cloudFileUrl}:`, error);
        }
      }

      // Update database - remove cloud references
      await prisma.creativeAssetVersion.update({
        where: { id: version.id },
        data: {
          cloudFileUrl: null,
          isSyncedToCloud: false,
          primaryStorage: 'LOCAL',
          cloudSyncId: null,
        },
      });
    }

    await prisma.creativeAsset.update({
      where: { id: project.id },
      data: {
        syncStatus: SyncStatus.ARCHIVED,
        syncedAt: new Date(),
      },
    });
  }

  return {
    versionsArchived: archivedVersionCount,
    projectsArchived: oldProjects.length,
  };
}

  async restoreFromArchive(versionId: string) {
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

    // Check if it should be re-synced to cloud
    const shouldResync = version.status === 'APPROVED' || version.status === 'CLIENT_REVIEW';
    
    if (shouldResync) {
      // Import SyncService dynamically to avoid circular dependency
      const { SyncService } = await import('./sync.service');
      const syncService = new SyncService(this.cloudStorage);
      await syncService.syncVersionToCloud(versionId);
    }

    // Update asset sync status
    await prisma.creativeAsset.update({
      where: { id: version.creativeAssetId },
      data: {
        syncStatus: shouldResync ? SyncStatus.SYNCED : SyncStatus.NOT_SYNCED,
        syncedAt: shouldResync ? new Date() : null,
      }
    });

    return {
      version,
      restored: true,
      syncedToCloud: shouldResync
    };
  }

  async getArchiveStats(agencyId: string) {
    const [totalArchived, totalSynced, totalLocal] = await Promise.all([
      prisma.creativeAsset.count({
        where: {
          agencyId,
          syncStatus: SyncStatus.ARCHIVED
        }
      }),
      prisma.creativeAsset.count({
        where: {
          agencyId,
          syncStatus: SyncStatus.SYNCED
        }
      }),
      prisma.creativeAsset.count({
        where: {
          agencyId,
          syncStatus: SyncStatus.NOT_SYNCED
        }
      })
    ]);

    return {
      totalArchived,
      totalSynced,
      totalLocal,
      total: totalArchived + totalSynced + totalLocal
    };
  }
}