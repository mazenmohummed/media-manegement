// app/api/creative-assets/[assetId]/versions/[versionId]/file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { getLocalStorageService, getCloudStorageService } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId, versionId } = await params;

    const version = await prisma.creativeAssetVersion.findFirst({
      where: { id: versionId, creativeAssetId: assetId, agencyId: session.user.agencyId },
      select: { localFileUrl: true, cloudFileUrl: true, isSyncedToCloud: true, mimeType: true },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    let fileBuffer: Buffer;

    if (version.isSyncedToCloud && version.cloudFileUrl) {
      fileBuffer = await getCloudStorageService().downloadFile(version.cloudFileUrl); // key, not URL
    } else if (version.localFileUrl) {
      fileBuffer = await getLocalStorageService().readFile(version.localFileUrl);
    } else {
      return NextResponse.json({ error: 'No file available' }, { status: 404 });
    }

    // ✅ Convert to a plain Uint8Array so it matches BodyInit cleanly
    const body = new Uint8Array(fileBuffer);

    return new NextResponse(body, {
      headers: {
        'Content-Type': version.mimeType || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}