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