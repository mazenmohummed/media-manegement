// lib/storage/storage-dashboard.service.ts
import { prisma } from '@/lib/prisma';
import { StorageMetrics } from './types';
import fs from 'fs/promises';

export class AgencyStorageDashboard {
  async getStorageMetrics(agencyId: string): Promise<StorageMetrics> {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId }
    });

    if (!agency) {
      throw new Error('Agency not found');
    }

    // ✅ Fix: Convert null to undefined
    const localStoragePath = agency.localStoragePath ?? undefined;
    
    // Local storage usage
    const localUsage = await this.getLocalStorageUsage(agencyId, localStoragePath);
    
    // Cloud storage usage (from database tracking)
    const cloudUsage = Number(agency.storageUsed || 0);
    const cloudUsageGB = cloudUsage / (1024 * 1024 * 1024);
    const quotaGB = Number(agency.cloudStorageQuota || 10737418240) / (1024 * 1024 * 1024);

    // File counts
    const [activeFiles, archivedFiles, syncedFiles] = await Promise.all([
      prisma.creativeAssetVersion.count({
        where: {
          agencyId,
          status: { in: ['DRAFT', 'CLIENT_REVIEW', 'APPROVED'] }
        }
      }),
      prisma.creativeAssetVersion.count({
        where: {
          agencyId,
          status: 'REJECTED'
        }
      }),
      prisma.creativeAssetVersion.count({
        where: {
          agencyId,
          isSyncedToCloud: true
        }
      })
    ]);

    return {
      local: {
        used: this.formatBytes(localUsage),
        total: 'UNLIMITED'
      },
      cloud: {
        used: parseFloat(cloudUsageGB.toFixed(2)),
        quota: parseFloat(quotaGB.toFixed(2)),
        percentage: quotaGB > 0 ? parseFloat(((cloudUsageGB / quotaGB) * 100).toFixed(2)) : 0
      },
      files: {
        active: activeFiles,
        archived: archivedFiles,
        synced: syncedFiles
      }
    };
  }

  // ✅ Fix: Accept string | undefined instead of string | null
  private async getLocalStorageUsage(agencyId: string, localStoragePath?: string): Promise<number> {
    if (!localStoragePath) return 0;

    try {
      const path = `${localStoragePath}/${agencyId}`;
      let totalSize = 0;

      // Recursively calculate directory size
      const files = await fs.readdir(path, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = `${path}/${file.name}`;
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating local storage usage:', error);
      return 0;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = `${dirPath}/${file.name}`;
        if (file.isDirectory()) {
          total += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          total += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    return total;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}