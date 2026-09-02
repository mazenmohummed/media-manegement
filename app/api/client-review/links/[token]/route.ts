// app/api/client-review/links/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// GET - Fetch review data
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token },
      include: {
        concept: {
          include: {
            assets: {
              include: {
                versions: {
                  orderBy: { versionNo: 'desc' },
                },
              },
            },
            project: {
              select: {
                projectName: true,
                client: {
                  select: {
                    clientName: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            clientName: true,
            email: true,
          },
        },
        assetApprovals: {
          include: {
            creativeAsset: true,
            creativeAssetVersion: true,
          },
        },
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: 'Review link not found' },
        { status: 404 }
      );
    }

    if (!reviewLink.isActive) {
      return NextResponse.json(
        { error: 'This review link has been deactivated' },
        { status: 410 }
      );
    }

    if (reviewLink.expiresAt && new Date() > reviewLink.expiresAt) {
      return NextResponse.json(
        { error: 'This review link has expired' },
        { status: 410 }
      );
    }

    if (reviewLink.maxViews > 0 && reviewLink.viewCount >= reviewLink.maxViews) {
      return NextResponse.json(
        { error: 'This review link has reached its view limit' },
        { status: 410 }
      );
    }

    // Increment view count
    await prisma.reviewLink.update({
      where: { id: reviewLink.id },
      data: { viewCount: { increment: 1 } },
    });

    const assetsWithApproval = reviewLink.concept.assets.map((asset) => {
      const approval = reviewLink.assetApprovals.find(
        (a) => a.assetId === asset.id
      );

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        latestVersion: asset.versions[0] || null,
        versions: asset.versions,
        approvalStatus: approval?.status || 'PENDING',
        feedback: approval?.feedback || null,
        approvedAt: approval?.approvedAt || null,
        revisionTaskId: approval?.revisionTaskId || null,
      };
    });

    return NextResponse.json({
      link: {
        id: reviewLink.id,
        token: reviewLink.token,
        createdAt: reviewLink.createdAt,
        expiresAt: reviewLink.expiresAt,
        isActive: reviewLink.isActive,
        viewCount: reviewLink.viewCount,
        maxViews: reviewLink.maxViews,
        reviewedAt: reviewLink.reviewedAt,
        reviewNotes: reviewLink.reviewNotes,
      },
      concept: {
        id: reviewLink.concept.id,
        name: reviewLink.concept.name,
        projectName: reviewLink.concept.project.projectName,
        clientName: reviewLink.concept.project.client.clientName,
        assets: assetsWithApproval,
      },
      client: {
        name: reviewLink.client.clientName,
        email: reviewLink.client.email,
      },
    });
  } catch (error) {
    console.error('Error fetching review link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review link' },
      { status: 500 }
    );
  }
}

// PATCH - Submit review/approval
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();
    const { assetApprovals, reviewNotes, reviewerName, reviewerEmail } = body;

    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token },
      include: {
        concept: {
          include: {
            assets: {
              include: {
                versions: {
                  orderBy: { versionNo: 'desc' },
                  take: 1,
                },
              },
            },
            project: {
              include: {
                client: true,
              },
            },
          },
        },
        agency: true,
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: 'Review link not found' },
        { status: 404 }
      );
    }

    if (!reviewLink.isActive) {
      return NextResponse.json(
        { error: 'This review link has been deactivated' },
        { status: 410 }
      );
    }

    if (reviewLink.expiresAt && new Date() > reviewLink.expiresAt) {
      return NextResponse.json(
        { error: 'This review link has expired' },
        { status: 410 }
      );
    }

    const processedApprovals = [];
    const notifications = [];

    for (const approval of assetApprovals) {
      const { assetId, status, feedback } = approval;

      const asset = reviewLink.concept.assets.find((a) => a.id === assetId);
      if (!asset) continue;

      const latestVersion = asset.versions[0];

      // Update or create approval record
      const approvalRecord = await prisma.reviewLinkAssetApproval.upsert({
        where: {
          reviewLinkId_assetId: {
            reviewLinkId: reviewLink.id,
            assetId,
          },
        },
        update: {
          status,
          feedback,
          approvedAt: status === 'APPROVED' ? new Date() : undefined,
          approvedBy: reviewerName || reviewerEmail || 'Anonymous',
          versionId: latestVersion?.id,
        },
        create: {
          reviewLinkId: reviewLink.id,
          assetId,
          status,
          feedback,
          approvedAt: status === 'APPROVED' ? new Date() : undefined,
          approvedBy: reviewerName || reviewerEmail || 'Anonymous',
          versionId: latestVersion?.id,
        },
      });

      // Update CreativeAssetVersion status
      if (latestVersion) {
        let versionStatus: string;
        if (status === 'APPROVED') {
          versionStatus = 'APPROVED';
        } else if (status === 'REVISIONS_REQUESTED' || status === 'REJECTED') {
          versionStatus = 'REJECTED';
        } else {
          versionStatus = 'CLIENT_REVIEW';
        }

        await prisma.creativeAssetVersion.update({
          where: { id: latestVersion.id },
          data: { 
            status: versionStatus as any,
            feedback: feedback || null,
          },
        });

        // Create revision task if rejected
        if (status === 'REJECTED' || status === 'REVISIONS_REQUESTED') {
          const revisionTask = await prisma.task.create({
            data: {
              taskNo: `REV-${Date.now()}`,
              taskType: 'REVISION',
              title: `Revisions requested for ${asset.name} (v${latestVersion.versionNo})`,
              description: feedback || 'Please revise this asset based on client feedback.',
              status: 'PENDING',
              priority: 'HIGH',
              projectId: reviewLink.concept.projectId,
              agencyId: reviewLink.agencyId,
              // Assign to original creator if available
              // This would need to track who created the version
            },
          });

          // Link revision task to approval
          await prisma.reviewLinkAssetApproval.update({
            where: { id: approvalRecord.id },
            data: { revisionTaskId: revisionTask.id },
          });

          processedApprovals.push({
            ...approvalRecord,
            revisionTaskId: revisionTask.id,
          });

          // Create notification for creative team
          notifications.push({
            type: 'REVISION_REQUESTED',
            title: `Revisions requested for ${asset.name}`,
            message: `${reviewerName || 'Client'} requested revisions: ${feedback || 'No specific feedback provided'}`,
            assetId: asset.id,
            versionId: latestVersion.id,
            taskId: revisionTask.id,
          });
        } else if (status === 'APPROVED') {
          notifications.push({
            type: 'APPROVED',
            title: `${asset.name} approved`,
            message: `${reviewerName || 'Client'} approved this asset.`,
            assetId: asset.id,
            versionId: latestVersion.id,
          });
        }
      }

      processedApprovals.push(approvalRecord);
    }

    // Update review link
    await prisma.reviewLink.update({
      where: { id: reviewLink.id },
      data: {
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        reviewedBy: reviewerName || reviewerEmail || 'Anonymous',
        assetApprovals: processedApprovals.reduce((acc, a) => {
          acc[a.assetId] = a.status;
          return acc;
        }, {} as Record<string, string>),
      },
    });

    // Send notifications (integrate with your notification system)
    for (const notification of notifications) {
      // Create notification records for the creative team
      await prisma.notification.create({
        data: {
          title: notification.title,
          message: notification.message,
          type: notification.type === 'APPROVED' ? 'SUCCESS' : 'ALERT',
          actionUrl: `/dashboard/projects/${reviewLink.concept.projectId}/concepts/${reviewLink.concept.id}/assets/${notification.assetId}`,
          userId: reviewLink.agency.users?.[0]?.id || '', // Send to agency admin
          agencyId: reviewLink.agencyId,
        },
      });
    }

    const allApproved = processedApprovals.every((a) => a.status === 'APPROVED');

    return NextResponse.json({
      success: true,
      message: allApproved ? 'All assets approved!' : 'Review submitted successfully',
      assetApprovals: processedApprovals,
      allApproved,
      notificationsSent: notifications.length,
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate review link
export async function DELETE(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = params;

    await prisma.reviewLink.update({
      where: { token },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Review link deactivated',
    });
  } catch (error) {
    console.error('Error deactivating review link:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate review link' },
      { status: 500 }
    );
  }
}