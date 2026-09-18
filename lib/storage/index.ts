// lib/storage/index.ts
import { CloudStorageService } from './cloud-storage.service';
import { HybridFileService } from './hybrid-file.service';
import { SyncService } from './sync.service';
import { ClientShareService } from './client-share.service';
import { AgencyStorageManager } from './agency-storage-manager';
import { ArchiveService } from './archive.service';
import { AgencyStorageDashboard } from './storage-dashboard.service';
import { LocalStorageService } from './local-storage.service';
import { HybridStorageService } from './hybrid-storage.service';

// ─── Cloud Storage ───────────────────────────────────────────────────────────
let cloudStorageService: CloudStorageService | null = null;

export function getCloudStorageService(): CloudStorageService {
  if (!cloudStorageService) {
    cloudStorageService = new CloudStorageService({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'agency-storage',
      endpoint: process.env.AWS_ENDPOINT,
    });
  }
  return cloudStorageService;
}

// ─── Local Storage ──────────────────────────────────────────────────────────
let localStorageService: LocalStorageService | null = null;

export function getLocalStorageService(): LocalStorageService {
  if (!localStorageService) {
    localStorageService = new LocalStorageService({
      basePath: process.env.LOCAL_STORAGE_PATH || '/var/storage',
      baseUrl: process.env.LOCAL_BASE_URL || 'http://localhost:3000/files',
    });
  }
  return localStorageService;
}

// ─── Hybrid Storage ─────────────────────────────────────────────────────────
export function getHybridStorageService(agencyId: string): HybridStorageService {
  return new HybridStorageService(agencyId);
}

// ─── Other Services ─────────────────────────────────────────────────────────
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

// ─── Exports ────────────────────────────────────────────────────────────────
// Export all services for direct use
export {
  CloudStorageService,
  LocalStorageService,
  HybridStorageService,
  HybridFileService,
  SyncService,
  ClientShareService,
  AgencyStorageManager,
  ArchiveService,
  AgencyStorageDashboard,
};

// Export types
export * from './types';