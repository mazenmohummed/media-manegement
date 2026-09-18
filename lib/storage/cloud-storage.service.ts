// lib/storage/cloud-storage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface CloudStorageConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucket?: string;
  endpoint?: string;
}

export class CloudStorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: CloudStorageConfig = {}) {
    const {
      accessKeyId = process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY,
      region = process.env.AWS_REGION || 'us-east-1',
      endpoint = process.env.AWS_ENDPOINT,
      bucket = process.env.AWS_S3_BUCKET || 'agency-storage',
    } = config;

    const s3Config: any = {
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    };

    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.forcePathStyle = true;
    }

    this.s3Client = new S3Client(s3Config);
    this.bucket = bucket;
  }

  async uploadFile(file: Buffer | string, key: string, options?: { mimeType?: string }): Promise<string> {
  const fileBuffer = typeof file === 'string' ? Buffer.from(file) : file;
  const command = new PutObjectCommand({
    Bucket: this.bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: options?.mimeType,
  });
  await this.s3Client.send(command);
  return key; // ✅ return the key, not a constructed URL
}

  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const chunks: Uint8Array[] = [];
    
    if (response.Body) {
      const stream = response.Body as any;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    }
    
    return Buffer.concat(chunks);
  }

  async createMultipartUpload(key: string, contentType?: string): Promise<string> {
    // Simplified - returns a presigned URL for multipart upload
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async completeMultipartUpload(key: string, etag: string): Promise<string> {
    // For simplicity, we're using a single upload. For true multipart, you'd need
    // to implement the multipart upload API.
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async getUploadProgress(key: string): Promise<number> {
    // Simplified - returns 0 or 100 based on existence
    const exists = await this.fileExists(key);
    return exists ? 100 : 0;
  }
}

// ✅ Add the getCloudStorageService factory function
let cloudStorageInstance: CloudStorageService | null = null;

export function getCloudStorageService(config?: CloudStorageConfig): CloudStorageService {
  if (!cloudStorageInstance) {
    cloudStorageInstance = new CloudStorageService(config);
  }
  return cloudStorageInstance;
}