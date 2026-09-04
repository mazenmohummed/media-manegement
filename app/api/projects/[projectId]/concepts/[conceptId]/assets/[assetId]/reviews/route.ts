// app/api/projects/[projectId]/concepts/[conceptId]/assets/[assetId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// Define the review type
type Review = {
  id: string;
  versionId: string;
  versionNo: number;
  status: string;
  feedback: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  reviewedAt: Date;
  reviewedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reviewerName: string;
  reviewerEmail: string | null;
  reviewerRole: string | null;
  type: string;
  source: string;
  approvalStatus: string | null;
  assetName: string;
  approvedBy: string | null;
  reviewLink: {
    id: string;
    token: string;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
  } | null;
  // ✅ Add general feedback field
  generalFeedback: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params
    const { projectId, conceptId, assetId } = await params;
    const agencyId = session.user.agencyId;

    // ✅ Get all versions for this specific asset only
    const versions = await prisma.creativeAssetVersion.findMany({
      where: {
        creativeAssetId: assetId, // ✅ This ensures only this asset's versions
        agencyId,
      },
      select: {
        id: true,
        versionNo: true,
        status: true,
        feedback: true,
        createdAt: true,
        updatedAt: true,
        reviewedById: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creativeAsset: {
          select: {
            id: true,
            name: true,
          },
        },
        // Get client review data from ReviewLinkAssetApproval
        reviewLinkAssetApprovals: {
          where: {
            // ✅ Only get approvals for this specific asset
            assetId: assetId,
          },
          include: {
            reviewLink: {
              include: {
                client: {
                  select: {
                    clientName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // ✅ If no versions found, return empty array
    if (versions.length === 0) {
      return NextResponse.json({
        reviews: [],
        assetName: null,
        total: 0,
      });
    }

    // ✅ Format reviews with complete data - show ALL approvals for this asset
    const reviews: Review[] = versions.flatMap((version) => {
      // If there are multiple approvals for this version, create a review for each
      if (version.reviewLinkAssetApprovals.length > 0) {
        return version.reviewLinkAssetApprovals.map((clientApproval): Review => {
          // Use client info from the review link
          const reviewerName = clientApproval.reviewLink?.client?.clientName || 
                                clientApproval.approvedBy || 
                                'Client';
          const reviewerEmail = clientApproval.reviewLink?.client?.email || null;
          const reviewerRole = 'CLIENT';
          const reviewedAt = clientApproval.approvedAt || clientApproval.updatedAt;
          // Get overall review notes from the review link
          const reviewNotes = clientApproval.reviewLink?.reviewNotes || null;
          // Use per-asset feedback from the approval, or fallback to version feedback
          const feedback = clientApproval.feedback || version.feedback;
          
          // ✅ Check if there's general feedback (stored separately)
          // You might need to add a field for general feedback in your schema
          // For now, we'll use the feedback field

          return {
            id: clientApproval.id,
            versionId: version.id,
            versionNo: version.versionNo,
            status: clientApproval.status || version.status,
            feedback: feedback,
            reviewNotes: reviewNotes,
            createdAt: clientApproval.createdAt,
            reviewedAt: reviewedAt,
            reviewedBy: version.reviewedBy,
            reviewerName: reviewerName,
            reviewerEmail: reviewerEmail,
            reviewerRole: reviewerRole,
            type: 'CLIENT_REVIEW',
            source: 'review_link',
            approvalStatus: clientApproval.status || null,
            assetName: version.creativeAsset.name,
            approvedBy: clientApproval.approvedBy,
            reviewLink: clientApproval.reviewLink ? {
              id: clientApproval.reviewLink.id,
              token: clientApproval.reviewLink.token,
              reviewedBy: clientApproval.reviewLink.reviewedBy,
              reviewedAt: clientApproval.reviewLink.reviewedAt,
              reviewNotes: clientApproval.reviewLink.reviewNotes,
            } : null,
            generalFeedback: null, // ✅ Add if you have a separate field
          };
        });
      }
      
      // If no client approvals, create a review from the version itself
      return [{
        id: version.id,
        versionId: version.id,
        versionNo: version.versionNo,
        status: version.status,
        feedback: version.feedback,
        reviewNotes: null,
        createdAt: version.createdAt,
        reviewedAt: version.updatedAt,
        reviewedBy: version.reviewedBy,
        reviewerName: version.reviewedBy?.name || 'Unknown',
        reviewerEmail: version.reviewedBy?.email || null,
        reviewerRole: version.reviewedBy?.role || null,
        type: 'INTERNAL_REVIEW',
        source: 'internal',
        approvalStatus: null,
        assetName: version.creativeAsset.name,
        approvedBy: null,
        reviewLink: null,
        generalFeedback: null,
      }];
    });

    // ✅ Sort reviews by createdAt descending (most recent first)
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // ✅ Log for debugging
    console.log(`Found ${reviews.length} reviews for asset ${assetId}`);

    return NextResponse.json({
      reviews,
      assetName: versions[0]?.creativeAsset?.name || null,
      total: reviews.length,
    });
  } catch (error) {
    console.error('Error fetching review history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review history' },
      { status: 500 }
    );
  }
}