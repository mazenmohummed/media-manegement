// app/api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { getHybridStorageService } from '@/lib/storage';
import { randomUUID } from 'crypto';
import { validateProductionAsset } from '@/lib/validations/production-assets';

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;

    const { projectId, conceptId, assetId } = await params;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId: conceptId,
        agencyId: agencyId,
        concept: { projectId: projectId },
      },
      include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const validation = validateProductionAsset(asset.type, file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const nextVersionNo = (asset.versions[0]?.versionNo || 0) + 1;
    const version = await prisma.creativeAssetVersion.create({
      data: {
        versionNo: nextVersionNo,
        creativeAssetId: asset.id,
        agencyId: agencyId,
        status: 'DRAFT',
        fileSize: file.size,
        mimeType: file.type,
        processingStatus: 'pending',
        fileHash: await computeFileHash(file),
        primaryStorage: 'LOCAL',
        isSyncedToCloud: false,
      },
    });

    // Upload — local-only; cloud sync happens later via the explicit sync endpoint
    const hybridStorage = getHybridStorageService(agencyId);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    const { fileUrl } = await hybridStorage.uploadFile(fileBuffer, fileName, {
      mimeType: file.type,
      versionId: version.id,
      assetId: asset.id,
    });

    // Update version with file metadata
    await prisma.creativeAssetVersion.update({
      where: { id: version.id },
      data: {
        fileUrl,
        processingStatus: 'completed',
        processedAt: new Date(),
        status: 'CLIENT_REVIEW',
        ...(file.type.startsWith('video/') && {
          duration: await getVideoDuration(file),
        }),
      },
    });

    // Create upload session record for tracking
    await prisma.uploadSession.create({
      data: {
        assetId: asset.id,
        versionId: version.id,
        uploadId: randomUUID(),
        totalSize: file.size,
        uploadedSize: file.size,
        status: 'completed',
        fileName: file.name,
        mimeType: file.type,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        agencyId: agencyId,
      },
    });

    // Log the upload
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'CreativeAssetVersion',
        entityId: version.id,
        message: `Version v${nextVersionNo} uploaded for asset: ${asset.name} (stored locally)`,
        metadata: {
          assetId: asset.id,
          versionNo: nextVersionNo,
          fileSize: file.size,
          mimeType: file.type,
        },
        agencyId: agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      versionId: version.id,
      versionNumber: version.versionNo,
      fileUrl,
      storageType: 'LOCAL',
      isSyncedToCloud: false,
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper functions
async function computeFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('Failed to compute file hash:', error);
    return '';
  }
}

async function getVideoDuration(file: File): Promise<number | null> {
  // Implementation depends on your setup
  // Could use FFmpeg or media-info
  // For now, return null
  return null;
}