// app/api/projects/[projectId]/concepts/[conceptId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, conceptId } = await params;
    const agencyId = session.user.agencyId;

    // Verify concept exists and belongs to the agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId,
        agencyId,
      },
      select: { id: true, name: true },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    // Get all review links for this concept (both active and completed)
    const reviewLinks = await prisma.reviewLink.findMany({
      where: {
        conceptId,
        agencyId,
        // Include all reviews, including those that might not be completed yet
        // But filter out drafts with no review data
        OR: [
          { reviewedAt: { not: null } }, // Completed reviews
          { status: 'ACTIVE' }, // Active review links
        ],
      },
      include: {
        reviewLinkAssetApprovals: {
          include: {
            creativeAsset: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            creativeAssetVersion: {
              select: {
                id: true,
                versionNo: true,
                fileUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            phoneNumber: true,
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If no reviews found, return empty array with helpful message
    if (reviewLinks.length === 0) {
      return NextResponse.json({
        reviews: [],
        total: 0,
        message: 'No reviews found for this concept',
        hasAssets: await prisma.creativeAsset.count({
          where: { conceptId },
        }) > 0,
      });
    }

    // Format reviews for display
    const formattedReviews = reviewLinks.map((link) => {
      // Parse concept feedback from reviewNotes
      let conceptFeedback = null;
      if (link.reviewNotes) {
        try {
          const parsed = JSON.parse(link.reviewNotes);
          if (parsed.overview || parsed.brief || parsed.overall) {
            conceptFeedback = parsed;
          }
        } catch {
          // Not JSON, treat as plain text
          conceptFeedback = { overall: link.reviewNotes };
        }
      }

      // Get asset approvals with details
      const assetApprovals = link.reviewLinkAssetApprovals.map((approval) => ({
        assetId: approval.assetId,
        assetName: approval.creativeAsset?.name || 'Unknown Asset',
        assetType: approval.creativeAsset?.type || 'OTHER',
        status: approval.status,
        feedback: approval.feedback,
        generalFeedback: approval.generalFeedback,
        approvedAt: approval.approvedAt,
        approvedBy: approval.approvedBy,
        versionId: approval.versionId,
        versionNo: approval.creativeAssetVersion?.versionNo || null,
        fileUrl: approval.creativeAssetVersion?.fileUrl || null,
      }));

      // Determine overall status
      const totalAssets = assetApprovals.length;
      const approvedCount = assetApprovals.filter((a) => a.status === 'APPROVED').length;
      const rejectedCount = assetApprovals.filter(
        (a) => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED'
      ).length;
      const pendingCount = assetApprovals.filter((a) => a.status === 'PENDING').length;

      let overallStatus = 'PENDING';
      if (totalAssets > 0) {
        if (pendingCount === 0 && rejectedCount === 0 && approvedCount === totalAssets) {
          overallStatus = 'APPROVED';
        } else if (rejectedCount > 0) {
          overallStatus = 'REVISIONS_REQUIRED';
        } else if (pendingCount === 0 && approvedCount > 0) {
          overallStatus = 'PARTIALLY_APPROVED';
        }
      }

      // Check if review is completed (all assets reviewed)
      const isComplete = pendingCount === 0 && totalAssets > 0;

      return {
        id: link.id,
        token: link.token,
        status: link.status,
        isActive: link.isActive,
        isComplete: isComplete,
        overallStatus: overallStatus,
        reviewedAt: link.reviewedAt,
        reviewedBy: link.reviewedBy,
        reviewerEmail: link.reviewerEmail,
        reviewNotes: link.reviewNotes,
        conceptFeedback: conceptFeedback,
        viewCount: link.viewCount,
        maxViews: link.maxViews,
        expiresAt: link.expiresAt,
        assetApprovals: assetApprovals,
        summary: {
          total: totalAssets,
          approved: approvedCount,
          rejected: rejectedCount,
          pending: pendingCount,
        },
        client: link.client ? {
          id: link.client.id,
          name: link.client.clientName,
          email: link.client.email,
          phone: link.client.phoneNumber,
        } : null,
        concept: {
          id: link.concept.id,
          name: link.concept.name,
        },
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      };
    });

    // Calculate statistics
    const totalReviews = formattedReviews.length;
    const completedReviews = formattedReviews.filter((r) => r.isComplete).length;
    const approvedReviews = formattedReviews.filter((r) => r.overallStatus === 'APPROVED').length;
    const pendingReviews = formattedReviews.filter((r) => !r.isComplete).length;

    return NextResponse.json({
      reviews: formattedReviews,
      total: totalReviews,
      stats: {
        total: totalReviews,
        completed: completedReviews,
        approved: approvedReviews,
        pending: pendingReviews,
        completionRate: totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0,
      },
      message: totalReviews > 0 ? 'Reviews fetched successfully' : 'No reviews found',
    });

  } catch (error) {
    console.error('Error fetching concept reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concept reviews' },
      { status: 500 }
    );
  }
}