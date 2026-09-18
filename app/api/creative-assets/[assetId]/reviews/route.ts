// app/api/creative-assets/[assetId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId } = await params;

    // Verify asset exists
    const asset = await prisma.creativeAsset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Fetch versions with feedback and review info
    const versions = await prisma.creativeAssetVersion.findMany({
      where: {
        creativeAssetId: assetId,
        feedback: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Fetch review link approvals for this asset
    const reviewApprovals = await prisma.reviewLinkAssetApproval.findMany({
      where: {
        assetId: assetId,
        feedback: { not: null },
      },
      include: {
        reviewLink: {
          select: {
            id: true,
            token: true,
            reviewedBy: true,
            reviewerEmail: true,
            reviewNotes: true,
            reviewedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform versions into review entries
    const versionReviews = versions.map((v) => ({
      id: v.id,
      versionNo: v.versionNo,
      status: v.status,
      feedback: v.feedback,
      reviewerName: v.reviewedBy?.name || null,
      reviewerEmail: v.reviewedBy?.email || null,
      reviewerRole: v.reviewedBy?.role || null,
      reviewedAt: v.updatedAt, // Use updatedAt as reviewedAt since CreativeAssetVersion has updatedAt
      createdAt: v.createdAt,
      type: v.status === 'CLIENT_REVIEW' ? 'CLIENT_REVIEW' : 'INTERNAL_REVIEW',
      source: v.reviewedBy?.role === 'CLIENT' ? 'client' : 'internal',
      assetName: asset.name,
      reviewLink: null,
    }));

    // Transform review link approvals into review entries
    const approvalReviews = reviewApprovals.map((a) => ({
      id: a.id,
      versionNo: 0, // No version number for review link approvals
      status: a.status,
      feedback: a.feedback || a.generalFeedback,
      reviewerName: a.reviewLink?.reviewedBy || a.approvedBy || null,
      reviewerEmail: a.reviewLink?.reviewerEmail || null,
      reviewerRole: null,
      reviewedAt: a.reviewLink?.reviewedAt || a.updatedAt,
      createdAt: a.createdAt,
      type: 'CLIENT_REVIEW',
      source: 'review_link',
      assetName: asset.name,
      reviewLink: a.reviewLink ? {
        id: a.reviewLink.id,
        token: a.reviewLink.token,
        reviewedBy: a.reviewLink.reviewedBy,
        reviewerEmail: a.reviewLink.reviewerEmail,
        reviewNotes: a.reviewLink.reviewNotes,
        reviewedAt: a.reviewLink.reviewedAt,
      } : null,
    }));

    // Combine and sort all reviews
    const allReviews = [...versionReviews, ...approvalReviews];
    allReviews.sort((a, b) => {
      const dateA = a.reviewedAt ? new Date(a.reviewedAt) : new Date(0);
      const dateB = b.reviewedAt ? new Date(b.reviewedAt) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate summary
    const summary = {
      approved: allReviews.filter(r => r.status === 'APPROVED').length,
      rejected: allReviews.filter(r => r.status === 'REJECTED' || r.status === 'REVISIONS_REQUIRED').length,
      pending: allReviews.filter(r => r.status === 'CLIENT_REVIEW' || r.status === 'INTERNAL_REVIEW').length,
      draft: allReviews.filter(r => r.status === 'DRAFT').length,
    };

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
      },
      reviews: allReviews,
      total: allReviews.length,
      summary,
    });

  } catch (error) {
    console.error('Error fetching review history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review history: ' + (error as Error).message },
      { status: 500 }
    );
  }
}