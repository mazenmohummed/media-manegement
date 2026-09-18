// lib/storage/local-storage.service.ts
import fs from 'fs/promises';
import path from 'path';

export interface LocalStorageConfig {
  basePath?: string;
  baseUrl?: string;
}

export class LocalStorageService {
  private basePath: string;
  private baseUrl: string;

  constructor(config: LocalStorageConfig = {}) {
    this.basePath = config.basePath || process.env.LOCAL_STORAGE_PATH || '/var/storage';
    this.baseUrl = config.baseUrl || process.env.LOCAL_BASE_URL || 'http://localhost:3000/files';
  }

  async uploadFile(
    file: Buffer | string,
    relativePath: string,
    options?: { mimeType?: string; basePath?: string }
  ): Promise<string> {
    const basePath = options?.basePath || this.basePath;
    const fullPath = path.join(basePath, relativePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    const fileBuffer = typeof file === 'string' ? Buffer.from(file) : file;
    await fs.writeFile(fullPath, fileBuffer);
    
    return relativePath;
  }

  async readFile(relativePath: string, basePath?: string): Promise<Buffer> {
    const fullPath = path.join(basePath || this.basePath, relativePath);
    return await fs.readFile(fullPath);
  }

  async deleteFile(relativePath: string, basePath?: string): Promise<void> {
    const fullPath = path.join(basePath || this.basePath, relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File doesn't exist - ignore
    }
  }

  async fileExists(relativePath: string, basePath?: string): Promise<boolean> {
    const fullPath = path.join(basePath || this.basePath, relativePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(relativePath: string, baseUrl?: string): Promise<string> {
    const url = baseUrl || this.baseUrl;
    return `${url}/${relativePath}`;
  }
}

// ✅ Add the getLocalStorageService factory function
let localStorageInstance: LocalStorageService | null = null;

export function getLocalStorageService(config?: LocalStorageConfig): LocalStorageService {
  if (!localStorageInstance) {
    localStorageInstance = new LocalStorageService(config);
  }
  return localStorageInstance;
}