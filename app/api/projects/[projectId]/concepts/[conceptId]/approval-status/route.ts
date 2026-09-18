// app/api/concepts/[conceptId]/approval-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { checkConceptApproval } from '@/lib/approval-gate';
import { prisma } from '@/lib/prisma';

// Define types for better type safety
interface AssetStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  versionNo: number;
  feedback: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> } // ✅ Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before accessing
    const { conceptId } = await params;
    const agencyId = session.user.agencyId;

    // Verify concept belongs to agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        agencyId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    const result = await checkConceptApproval(conceptId);

    // Get detailed asset status for the frontend
    const assets = await prisma.creativeAsset.findMany({
      where: {
        conceptId,
        agencyId,
      },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    // Map assets with proper typing
    const assetStatuses: AssetStatus[] = assets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.versions[0]?.status || 'DRAFT',
      versionNo: asset.versions[0]?.versionNo || 0,
      feedback: asset.versions[0]?.feedback || null,
    }));

    // Calculate summary
    const summary = {
      total: assets.length,
      approved: assets.filter(
        (a: any) => a.versions[0]?.status === 'APPROVED'
      ).length,
      pending: assets.filter(
        (a: any) =>
          a.versions[0]?.status === 'CLIENT_REVIEW' ||
          a.versions[0]?.status === 'INTERNAL_REVIEW' ||
          a.versions[0]?.status === 'DRAFT'
      ).length,
      rejected: assets.filter(
        (a: any) =>
          a.versions[0]?.status === 'REJECTED' ||
          a.versions[0]?.status === 'REVISIONS_REQUIRED'
      ).length,
    };

    return NextResponse.json({
      concept: {
        id: concept.id,
        name: concept.name,
        status: concept.status,
      },
      canProceed: result.canProceed,
      errors: result.errors,
      warnings: result.warnings,
      assets: assetStatuses,
      summary,
    });
  } catch (error) {
    console.error('Error checking approval status:', error);
    return NextResponse.json(
      { error: 'Failed to check approval status' },
      { status: 500 }
    );
  }
}