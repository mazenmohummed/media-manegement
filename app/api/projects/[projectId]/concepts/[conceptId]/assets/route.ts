import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// GET: List all assets for a concept
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Verify concept exists
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user?.agencyId,
      },
      select: { id: true },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const assets = await prisma.creativeAsset.findMany({
      where: {
        conceptId,
        agencyId: user?.agencyId,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST: Upload a new asset for a concept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId } = await params;

    // Validate IDs
    if (!projectId || !conceptId) {
      return NextResponse.json(
        { error: 'Project ID and Concept ID are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify concept exists and belongs to the project
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId: user.agencyId,
      },
      select: { id: true, name: true },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const file = formData.get('file') as File;

    if (!name || !file) {
      return NextResponse.json(
        { error: 'Name and file are required' },
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

    // Create upload directory if it doesn't exist
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

    // Get the latest version number for this asset
    const latestAsset = await prisma.creativeAsset.findFirst({
      where: {
        conceptId,
        name: name,
      },
      orderBy: {
        versions: {
          _count: 'desc',
        },
      },
    });

    // Check if asset with same name exists
    const existingAsset = await prisma.creativeAsset.findFirst({
      where: {
        conceptId,
        name: name,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    let asset;

    if (existingAsset) {
      // Add new version to existing asset
      const latestVersion = existingAsset.versions[0];
      const newVersionNo = (latestVersion?.versionNo || 0) + 1;

      asset = await prisma.creativeAsset.update({
        where: { id: existingAsset.id },
        data: {
          type: type as any,
          updatedAt: new Date(),
          versions: {
            create: {
              versionNo: newVersionNo,
              fileUrl: fileUrl,
              status: 'DRAFT',
              agency: {
                connect: { id: user.agencyId }
              }
            }
          }
        },
        include: {
          versions: {
            orderBy: { versionNo: 'desc' },
          },
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'CreativeAsset',
          entityId: asset.id,
          message: `Added version ${newVersionNo} to asset "${asset.name}" for concept "${concept.name}"`,
          agencyId: user.agencyId,
          actorId: session.user.id,
        },
      });
    } else {
      // Create new asset with first version
      asset = await prisma.creativeAsset.create({
        data: {
          name,
          type: type as any,
          concept: {
            connect: { id: conceptId }
          },
          agency: {
            connect: { id: user.agencyId }
          },
          versions: {
            create: {
              versionNo: 1,
              fileUrl: fileUrl,
              status: 'DRAFT',
              agency: {
                connect: { id: user.agencyId }
              }
            }
          }
        },
        include: {
          versions: {
            orderBy: { versionNo: 'desc' },
          },
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'CreativeAsset',
          entityId: asset.id,
          message: `Created asset "${asset.name}" for concept "${concept.name}"`,
          agencyId: user.agencyId,
          actorId: session.user.id,
        },
      });
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      { error: 'Failed to upload asset' },
      { status: 500 }
    );
  }
}