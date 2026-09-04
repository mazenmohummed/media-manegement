// lib/storage/hybrid-file.service.ts
import { prisma } from '@/lib/prisma';
import { CloudStorageService } from './cloud-storage.service';
import { SyncService } from './sync.service';
import { UploadOptions } from './types';
import fs from 'fs/promises';
import path from 'path';

export class HybridFileService {
  private cloudStorage: CloudStorageService;
  private syncService: SyncService;

  // ✅ Accept cloudStorage and syncService as separate arguments
  constructor(cloudStorage: CloudStorageService, syncService: SyncService) {
    this.cloudStorage = cloudStorage;
    this.syncService = syncService;
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    agencyId: string,
    conceptId: string,
    options: UploadOptions = { syncToCloud: false }
  ) {
    const agency = await this.getAgency(agencyId);
    
    // 1. Always save locally first (FREE!)
    const localPath = this.generateLocalPath(agency, conceptId, fileName);
    await this.saveToLocalStorage(file, localPath);
    
    // 2. Create version record
    const version = await prisma.creativeAssetVersion.create({
      data: {
        versionNo: await this.getNextVersion(conceptId),
        localFileUrl: localPath,
        primaryStorage: 'LOCAL',
        fileSize: file.length,
        creativeAssetId: conceptId,
        agencyId: agencyId,
        status: 'DRAFT'
      }
    });

    // 3. Sync to cloud if needed
    if (options.syncToCloud || options.shareWithClient) {
      await this.syncService.syncVersionToCloud(version.id);
    }

    // 4. Generate access URL
    const accessUrl = options.shareWithClient
      ? await this.generateSharedUrl(version.id, agencyId)
      : `/api/files/${agencyId}/${conceptId}/${version.id}`;

    return {
      version,
      accessUrl,
      storageType: 'LOCAL',
      synced: options.syncToCloud || false
    };
  }

  private async getAgency(agencyId: string) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId }
    });
    if (!agency) throw new Error('Agency not found');
    return agency;
  }

  private generateLocalPath(agency: any, conceptId: string, fileName: string): string {
    const basePath = agency.localStoragePath || '/tmp/agency-storage';
    return path.join(basePath, agency.id, 'concepts', conceptId, fileName);
  }

  private async saveToLocalStorage(file: Buffer, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file);
  }

  private async getNextVersion(conceptId: string): Promise<number> {
    const latest = await prisma.creativeAssetVersion.findFirst({
      where: { creativeAssetId: conceptId },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true }
    });
    return (latest?.versionNo || 0) + 1;
  }

  private async generateSharedUrl(versionId: string, agencyId: string): Promise<string> {
    return `/api/proxy/${agencyId}/${versionId}`;
  }
}