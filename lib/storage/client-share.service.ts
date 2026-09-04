// lib/storage/client-share.service.ts
import { prisma } from '@/lib/prisma';
import { CloudStorageService } from './cloud-storage.service';
import { ShareUrlResult } from './types';

export class ClientShareService {
  private cloudStorage: CloudStorageService;

  constructor(cloudStorage: CloudStorageService) {
    this.cloudStorage = cloudStorage;
  }

  async generateClientShareUrl(versionId: string, clientEmail: string): Promise<ShareUrlResult> {
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

    // If file is in cloud, use cloud URL
    if (version.isSyncedToCloud && version.cloudFileUrl) {
      try {
        const signedUrl = await this.cloudStorage.generateSignedUrl(
          version.cloudFileUrl,
          604800 // 7 days
        );
        return {
          url: signedUrl,
          type: 'CLOUD',
          expiresIn: '7 days'
        };
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }

    // Fallback: proxy through your server
    return {
      url: `/api/proxy/${version.agencyId}/${version.creativeAssetId}/${version.id}`,
      type: 'PROXY',
      expiresIn: '7 days'
    };
  }

  async proxyFile(agencyId: string, assetId: string, versionId: string) {
    const version = await this.validateAccess(versionId, agencyId);
    
    if (!version.localFileUrl) {
      throw new Error('File not found locally');
    }

    // Stream file from local storage
    const fs = await import('fs/promises');
    const file = await fs.readFile(version.localFileUrl);
    
    return file;
  }

  private async validateAccess(versionId: string, agencyId: string) {
    const version = await prisma.creativeAssetVersion.findUnique({
      where: { 
        id: versionId,
        agencyId: agencyId
      }
    });

    if (!version) {
      throw new Error('Access denied or file not found');
    }

    return version;
  }
}