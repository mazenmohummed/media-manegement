// lib/storage/index.ts
import { CloudStorageService } from './cloud-storage.service';
import { HybridFileService } from './hybrid-file.service';
import { SyncService } from './sync.service';
import { ClientShareService } from './client-share.service';
import { AgencyStorageManager } from './agency-storage-manager';
import { ArchiveService } from './archive.service';
import { AgencyStorageDashboard } from './storage-dashboard.service';

// Singleton instance
let cloudStorageService: CloudStorageService | null = null;

export function getCloudStorageService(): CloudStorageService {
  if (!cloudStorageService) {
    // ✅ Pass a single config object
    cloudStorageService = new CloudStorageService({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'agency-storage',
      endpoint: process.env.AWS_ENDPOINT, // For Backblaze, Cloudflare R2, etc.
    });
  }
  return cloudStorageService;
}

export function getHybridFileService(): HybridFileService {
  return new HybridFileService(
    getCloudStorageService(),
    new SyncService(getCloudStorageService())
  );
}

export function getSyncService(): SyncService {
  return new SyncService(getCloudStorageService());
}

export function getClientShareService(): ClientShareService {
  return new ClientShareService(getCloudStorageService());
}

export function getAgencyStorageManager(): AgencyStorageManager {
  return new AgencyStorageManager();
}

export function getArchiveService(): ArchiveService {
  return new ArchiveService(getCloudStorageService());
}

export function getAgencyStorageDashboard(): AgencyStorageDashboard {
  return new AgencyStorageDashboard();
}

// Export all services for direct use
export {
  CloudStorageService,
  HybridFileService,
  SyncService,
  ClientShareService,
  AgencyStorageManager,
  ArchiveService,
  AgencyStorageDashboard,
};

// Export types
export * from './types';