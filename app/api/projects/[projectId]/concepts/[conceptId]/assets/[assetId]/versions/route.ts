import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// POST: Add a new version to an existing asset
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId, assetId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify asset exists
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        concept: {
          select: { name: true },
        },
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const status = formData.get('status') as string || 'DRAFT';
    const feedback = formData.get('feedback') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'concepts', conceptId, 'assets');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create file URL
    const fileUrl = `/uploads/concepts/${conceptId}/assets/${fileName}`;

    // Get latest version number
    const latestVersion = asset.versions[0];
    const newVersionNo = (latestVersion?.versionNo || 0) + 1;

    // Create new version
    const version = await prisma.creativeAssetVersion.create({
      data: {
        versionNo: newVersionNo,
        fileUrl: fileUrl,
        status: status as any,
        feedback: feedback || undefined,
        creativeAsset: {
          connect: { id: assetId }
        },
        agency: {
          connect: { id: user?.agencyId! }
        },
        reviewedBy: session.user.id ? {
          connect: { id: session.user.id }
        } : undefined,
      },
    });

    // Update asset updatedAt
    await prisma.creativeAsset.update({
      where: { id: assetId },
      data: { updatedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'CreativeAssetVersion',
        entityId: version.id,
        message: `Added version ${newVersionNo} to asset "${asset.name}" for concept "${asset.concept.name}"`,
        agencyId: user?.agencyId!,
        actorId: session.user.id,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Error adding asset version:', error);
    return NextResponse.json(
      { error: 'Failed to add version' },
      { status: 500 }
    );
  }
}