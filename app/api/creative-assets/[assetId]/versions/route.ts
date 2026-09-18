// app/api/creative-assets/[assetId]/versions/route.ts (full version with GET and POST)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { getHybridStorageService } from '@/lib/storage';
import { validateProductionAsset } from '@/lib/validations/production-assets';
import { randomUUID } from 'crypto';

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    const { assetId } = await params;

    // Verify asset exists and belongs to agency
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get all versions
    const versions = await prisma.creativeAssetVersion.findMany({
      where: {
        creativeAssetId: assetId,
        deletedAt: null,
      },
      include: {
        reviewLinkAssetApprovals: {
          select: {
            id: true,
            status: true,
            approvedAt: true,
          },
        },
        uploadSessions: {
          where: {
            status: 'completed',
          },
          select: {
            id: true,
            uploadedSize: true,
            completedAt: true,
          },
          take: 1,
        },
      },
      orderBy: {
        versionNo: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
        },
        versions: versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          fileUrl: v.fileUrl,
          localFileUrl: v.localFileUrl,
          cloudFileUrl: v.cloudFileUrl,
          primaryStorage: v.primaryStorage,
          status: v.status,
          fileSize: v.fileSize,
          mimeType: v.mimeType,
          duration: v.duration,
          resolution: v.resolution,
          thumbnailUrl: v.thumbnailUrl,
          isSyncedToCloud: v.isSyncedToCloud,
          syncedAt: v.syncedAt,
          processingStatus: v.processingStatus,
          processedAt: v.processedAt,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          reviewCount: v.reviewLinkAssetApprovals.length,
          hasCompletedUpload: v.uploadSessions.length > 0,
        })),
        total: versions.length,
      },
    });

  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Validate agencyId exists
    const agencyId = session.user.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID not found' }, { status: 400 });
    }

    // ✅ Get actor ID with fallback
    const actorId = session.user.id ?? 'system';

    const { assetId } = await params;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ✅ SECURITY: Get asset to determine type and verify ownership
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: agencyId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ✅ Validate file for asset type
    const validation = validateProductionAsset(asset.type, file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // ✅ GENERATE UNIQUE KEY FOR CONCURRENCY & RETRY
    const uploadKey = randomUUID();

    // Hash file (for deduplication)
    const fileHash = await computeFileHash(file);

    let nextVersionNo = 1;

    try {
      const result = await prisma.$transaction(async (tx) => {
        
        const existingSession = await tx.uploadSession.findUnique({
          where: { uploadId: uploadKey },
        });

        if (existingSession && existingSession.status === "failed") {
          await tx.uploadSession.update({
            where: { id: existingSession.id },
            data: { status: "in_progress", uploadedSize: 0, completedParts: 0 },
          });
        } else if (existingSession && existingSession.status === "in_progress") {
          return { status: 409, error: "Another upload is already in progress for this asset" };
        }

        const lockedAsset = await tx.$queryRaw`
          SELECT id FROM "CreativeAsset" 
          WHERE id = ${assetId} 
          FOR UPDATE
        `;

        if (!lockedAsset) throw new Error("Asset not found");

        const latestVersion = await tx.creativeAssetVersion.findFirst({
          where: { creativeAssetId: assetId, deletedAt: null },
          orderBy: { versionNo: 'desc' },
          select: { versionNo: true },
        });

        nextVersionNo = (latestVersion?.versionNo || 0) + 1;

        const version = await tx.creativeAssetVersion.create({
          data: {
            versionNo: nextVersionNo,
            creativeAssetId: asset.id,
            agencyId: agencyId,
            status: 'DRAFT',
            fileSize: BigInt(file.size),
            mimeType: file.type,
            processingStatus: 'pending',
            fileHash: fileHash,
            primaryStorage: 'LOCAL',
            isSyncedToCloud: false,
            uploadKey: uploadKey,
          },
        });

        await tx.uploadSession.create({
          data: {
            assetId: asset.id,
            versionId: version.id,
            uploadId: uploadKey,
            totalSize: BigInt(file.size),
            uploadedSize: BigInt(file.size),
            status: 'in_progress',
            fileName: file.name,
            mimeType: file.type,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            agencyId: agencyId,
          },
        });

        return { version };
      });

      if ((result as any).status === 409) {
        return NextResponse.json({ error: (result as any).error }, { status: 409 });
      }

      const version = (result as any).version;

      const hybridStorage = getHybridStorageService(agencyId);
      const storageStats = await hybridStorage.getStorageStats();

      let storageWarning: string | null = null;
      if (storageStats.isNearLimit) {
        storageWarning = `Storage is ${storageStats.percentageUsed.toFixed(1)}% full. Consider upgrading your plan.`;
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      try {
        const { fileUrl, localRawPath } = await hybridStorage.uploadFile(fileBuffer, file.name, {
          mimeType: file.type,
          versionId: version.id,
          assetId: asset.id,
        });

        await prisma.creativeAssetVersion.update({
          where: { id: version.id },
          data: {
            fileUrl,
            processingStatus: 'completed',
            processedAt: new Date(),
          },
        });

        await prisma.uploadSession.update({
          where: { uploadId: uploadKey },
          data: { status: 'completed' },
        });

        await prisma.auditLog.create({
          data: {
            action: 'CREATE',
            entityType: 'CreativeAssetVersion',
            entityId: version.id,
            message: `New version v${nextVersionNo} uploaded for asset: ${asset.name} (stored locally)`,
            metadata: {
              assetId: asset.id,
              versionNo: nextVersionNo,
              fileSize: file.size,
              mimeType: file.type,
            },
            agencyId: agencyId,
            actorId: actorId,
          },
        });

        return NextResponse.json({
          success: true,
          version: {
            id: version.id,
            versionNo: version.versionNo,
            fileUrl,
            isSyncedToCloud: false,
            primaryStorage: 'LOCAL',
            status: version.status,
            fileSize: version.fileSize,
            mimeType: version.mimeType,
            createdAt: version.createdAt,
          },
          storage: {
            usedGB: storageStats.usedGB,
            quotaGB: storageStats.quotaGB,
            percentageUsed: storageStats.percentageUsed,
            isNearLimit: storageStats.isNearLimit,
            isFull: storageStats.isFull,
          },
          warning: storageWarning,
        }, { status: 201 });

      } catch (uploadError) {
        await prisma.uploadSession.update({
          where: { uploadId: uploadKey },
          data: { status: 'failed' },
        });

        await prisma.creativeAssetVersion.update({
          where: { id: version.id },
          data: { processingStatus: 'failed', processingError: 'Upload failed' },
        });

        console.error('Error uploading file:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload file to storage', retryable: true, uploadKey },
          { status: 500 }
        );
      }

    } catch (txError) {
      console.error('Transaction failed:', txError);
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error uploading version:', error);
    return NextResponse.json(
      { error: 'Failed to upload version' },
      { status: 500 }
    );
  }
}

async function computeFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}