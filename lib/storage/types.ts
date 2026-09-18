// lib/storage/types.ts

export interface StorageConfig {
  storageType: 'LOCAL_NAS' | 'LOCAL_SERVER' | 'S3' | 'CLOUD_ONLY';
  networkPath?: string;
  credentials?: any;
}

export interface UploadOptions {
  syncToCloud?: boolean;
  shareWithClient?: boolean;
  isActive?: boolean;
}

export interface ShareUrlResult {
  url: string;
  type: 'CLOUD' | 'PROXY';
  expiresIn?: string;
}

export interface StorageMetrics {
  local: {
    used: string;
    total: string;
  };
  cloud: {
    used: number;
    quota: number;
    percentage: number;
  };
  files: {
    active: number;
    archived: number;
    synced: number;
  };
}

export interface AgencyStorageConfig {
  storageStrategy: string;
  localStoragePath: string | null;
  localBaseUrl: string | null;
  syncEnabled: boolean;
  cloudStorageQuota: bigint;
  storageUsed: bigint;
}

// ✅ Storage Strategy enum
export enum StorageStrategy {
  LOCAL_ONLY = 'LOCAL_ONLY',
  CLOUD_ONLY = 'CLOUD_ONLY',
  HYBRID = 'HYBRID',
}

// ✅ Storage Type enum
export enum StorageType {
  LOCAL = 'LOCAL',
  CLOUD = 'CLOUD',
  BOTH = 'BOTH',
}

// ✅ Sync status enum
export enum SyncStatus {
  NOT_SYNCED = 'NOT_SYNCED',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

// ✅ File info interface
export interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
}