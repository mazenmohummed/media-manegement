// lib/storage/hybrid-storage.service.ts
import { prisma } from '@/lib/prisma';
import { getCloudStorageService } from './cloud-storage.service';
import { getLocalStorageService } from './local-storage.service';
import { StorageType, StorageStrategy } from './types';
import path from 'path';

export class HybridStorageService {
  private cloudStorage = getCloudStorageService();
  private localStorage = getLocalStorageService();

  constructor(private agencyId: string) {}

  async uploadFile(
    file: Buffer | string,
    fileName: string,
    options: { mimeType?: string; versionId: string; assetId: string }
  ): Promise<{ fileUrl: string; localRawPath: string }> {
    const agency = await prisma.agency.findUnique({
      where: { id: this.agencyId },
      select: { localStoragePath: true },
    });

    const relativePath = `assets/${options.assetId}/versions/${options.versionId}/${fileName}`;

    const localRawPath = await this.localStorage.uploadFile(file, relativePath, {
      mimeType: options.mimeType,
      basePath: agency?.localStoragePath || undefined,
    });

    const fileUrl = `/api/creative-assets/${options.assetId}/versions/${options.versionId}/file`;

    await prisma.creativeAssetVersion.update({
      where: { id: options.versionId },
      data: {
        localFileUrl: localRawPath,
        primaryStorage: StorageType.LOCAL,
        isSyncedToCloud: false,
      },
    });

    await prisma.agency.update({
      where: { id: this.agencyId },
      data: {
        storageUsed: {
          increment: typeof file === 'string' ? Buffer.byteLength(file, 'utf8') : file.length,
        },
      },
    });

    return { fileUrl, localRawPath };
  }

  /**
   * Manually sync an already-uploaded local file to the cloud.
   */
  async syncToCloud(versionId: string): Promise<{ success: boolean }> {
    const version = await prisma.creativeAssetVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) throw new Error('Version not found');
    if (!version.localFileUrl) throw new Error('No local file to sync');
    if (version.isSyncedToCloud) return { success: true };

    const fileBuffer = await this.localStorage.readFile(version.localFileUrl);
    const fileName = path.basename(version.localFileUrl);
    const key = `agencies/${this.agencyId}/assets/${version.creativeAssetId}/versions/${versionId}/${fileName}`;

    const cloudKey = await this.cloudStorage.uploadFile(fileBuffer, key, {
      mimeType: version.mimeType || undefined,
    });

    await prisma.creativeAssetVersion.update({
      where: { id: versionId },
      data: {
        cloudFileUrl: cloudKey, // ✅ storing the key now, not a full URL
        isSyncedToCloud: true,
        syncedAt: new Date(),
        primaryStorage: StorageType.BOTH,
      },
    });

    await prisma.creativeAsset.update({
      where: { id: version.creativeAssetId },
      data: { isSynced: true, syncedAt: new Date(), syncStatus: 'SYNCED' },
    });

    return { success: true };
  }

  async getStorageStats() {
    const agency = await prisma.agency.findUnique({
      where: { id: this.agencyId },
      select: { storageUsed: true, cloudStorageQuota: true, storageStrategy: true },
    });
    if (!agency) throw new Error('Agency not found');

    const usedGB = Number(agency.storageUsed) / 1024 / 1024 / 1024;
    const quotaGB = Number(agency.cloudStorageQuota) / 1024 / 1024 / 1024;
    const percentageUsed = (usedGB / quotaGB) * 100;

    return {
      usedGB, quotaGB, percentageUsed,
      isNearLimit: percentageUsed > 80,
      isFull: percentageUsed >= 95,
      strategy: agency.storageStrategy,
    };
  }
}