// app/api/creative-assets/[assetId]/versions/[versionId]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { getHybridStorageService } from '@/lib/storage';

export async function POST(
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
    });
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const hybridStorage = getHybridStorageService(session.user.agencyId);
    const result = await hybridStorage.syncToCloud(versionId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error syncing to cloud:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync to cloud' }, { status: 500 });
  }
}