// app/api/projects/[projectId]/review-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const reviewLinks = await prisma.reviewLink.findMany({
      where: {
        concept: {
          projectId: projectId,
          agencyId: session.user.agencyId,
        },
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true,
            brief: true,
            project: {
              select: {
                id: true,
                projectName: true,
                brief: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    objectives: true,
                    audience: true,
                    keyMessage: true,
                    deliverables: true,
                    references: true,
                    budget: true,
                  },
                },
                client: {
                  select: {
                    clientName: true,
                    email: true,
                  },
                },
              },
            },
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
        agency: {
          select: {
            id: true,
            agencyName: true,
            storageStrategy: true,
          },
        },
        reviewLinkAssetApprovals: {
          include: {
            creativeAsset: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
              },
            },
            creativeAssetVersion: {
              select: {
                id: true,
                versionNo: true,
                fileUrl: true,
                localFileUrl: true,
                cloudFileUrl: true,
                createdAt: true,
                updatedAt: true,
                status: true,
                isSyncedToCloud: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ✅ Transform data to include brief approval status
    const transformedLinks = reviewLinks.map((link) => {
      // Check if brief was approved/rejected via review notes
      let briefApprovalStatus = 'PENDING';
      let briefFeedback = null;
      
      if (link.reviewNotes) {
        try {
          const parsed = JSON.parse(link.reviewNotes);
          if (parsed.brief) {
            briefApprovalStatus = 'APPROVED';
            briefFeedback = parsed.brief;
          } else if (parsed.overview || parsed.overall) {
            // If there's any feedback but no brief-specific, brief might not have been reviewed
            briefApprovalStatus = 'PENDING';
          }
        } catch {
          // If reviewNotes is plain text, check if brief was mentioned
          if (link.reviewNotes.toLowerCase().includes('brief')) {
            briefApprovalStatus = 'REVIEWED';
          }
        }
      }

      // Check if brief status was updated in the project brief
      const briefStatus = link.concept.project.brief?.status;
      if (briefStatus === 'APPROVED') {
        briefApprovalStatus = 'APPROVED';
      } else if (briefStatus === 'REVISIONS_REQUIRED') {
        briefApprovalStatus = 'REVISIONS_REQUESTED';
      }

      return {
        ...link,
        briefApprovalStatus,
        briefFeedback,
        hasBrief: !!link.concept.project.brief,
      };
    });

    return NextResponse.json(transformedLinks);

  } catch (error) {
    console.error('Error fetching review links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review links' },
      { status: 500 }
    );
  }
}