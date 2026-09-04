// app/api/client-review/links/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { ClientShareService } from '@/lib/storage/client-share.service';
import { getCloudStorageService } from '@/lib/storage';

// Initialize services
const cloudStorage = getCloudStorageService();
const clientShareService = new ClientShareService(cloudStorage);

// Shared include shape for pulling the full project tree (milestones -> tasks ->
// concepts -> assets -> latest version, plus direct tasks/concepts on the project).
// Used by both GET and PATCH so asset lookups are never scoped to just the
// review link's own concept.
const projectTreeInclude = {
  client: true,
  agency: true,
  brief: true,
  milestones: {
    include: {
      tasks: {
        include: {
          concepts: {
            include: {
              assets: {
                include: {
                  versions: { orderBy: { versionNo: 'desc' as const }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  },
  tasks: {
    include: {
      concepts: {
        include: {
          assets: {
            include: {
              versions: { orderBy: { versionNo: 'desc' as const }, take: 1 },
            },
          },
        },
      },
    },
  },
  concepts: {
    include: {
      assets: {
        include: {
          versions: { orderBy: { versionNo: 'desc' as const }, take: 1 },
        },
      },
    },
  },
};

// Build a flat map of every asset (with its latest version) across the whole
// project tree: direct concepts, direct tasks' concepts, and milestone tasks'
// concepts. Assets are only ever attached via a concept, so this covers every
// asset a reviewer could see or approve.
function buildAssetMap(project: any): Map<string, any> {
  const map = new Map<string, any>();
  const collect = (assets: any[]) => assets?.forEach((a) => map.set(a.id, a));

  project.concepts?.forEach((c: any) => collect(c.assets));
  project.tasks?.forEach((t: any) => t.concepts?.forEach((c: any) => collect(c.assets)));
  project.milestones?.forEach((m: any) =>
    m.tasks?.forEach((t: any) => t.concepts?.forEach((c: any) => collect(c.assets)))
  );

  return map;
}

// GET - Fetch review data with full project structure
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token },
      include: {
        concept: {
          include: {
            project: {
              include: projectTreeInclude,
            },
          },
        },
        client: {
          select: {
            clientName: true,
            email: true,
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

    const maxViews = reviewLink.maxViews ?? 0;
    if (maxViews > 0 && reviewLink.viewCount >= maxViews) {
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

    const project = reviewLink.concept.project;

    const approvalMap = new Map();
    reviewLink.reviewLinkAssetApprovals.forEach((approval: any) => {
      approvalMap.set(approval.assetId, approval);
    });

    const processAssets = (assets: any[]) => {
      return assets.map((asset: any) => {
        const latestVersion = asset.versions?.[0] || null;
        let fileUrl = null;
        let fileType = null;

        if (latestVersion) {
          try {
            if (latestVersion.cloudFileUrl) {
              fileUrl = latestVersion.cloudFileUrl;
              fileType = 'CLOUD';
            } else if (latestVersion.localFileUrl) {
              fileUrl = `/api/proxy/${reviewLink.agencyId}/${asset.id}/${latestVersion.id}`;
              fileType = 'PROXY';
            }
          } catch (error) {
            console.error(`Failed to generate URL for asset ${asset.id}:`, error);
          }
        }

        const approval = approvalMap.get(asset.id);
        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          description: asset.description || null,
          latestVersion: latestVersion,
          versions: asset.versions || [],
          fileUrl,
          fileType,
          approvalStatus: approval?.status || 'PENDING',
          feedback: approval?.feedback || null,
          generalFeedback: approval?.generalFeedback || null,
          approvedAt: approval?.approvedAt || null,
          revisionTaskId: approval?.revisionTaskId || null,
        };
      });
    };

    const processConcepts = (concepts: any[]) => {
      return concepts.map((concept: any) => ({
        id: concept.id,
        name: concept.name,
        description: concept.description || null,
        brief: concept.brief || null,
        status: concept.status || 'DRAFT',
        assets: processAssets(concept.assets || []),
        approvalStatus: 'PENDING',
        feedback: null,
        approvedAt: null,
        revisionTaskId: null,
      }));
    };

    const processTasks = (tasks: any[]) => {
      return tasks.map((task: any) => ({
        id: task.id,
        title: task.title || task.taskType || 'Untitled Task',
        description: task.description || null,
        status: task.status || 'PENDING',
        priority: task.priority || 'MEDIUM',
        taskType: task.taskType || 'STANDARD',
        dueDate: task.dueDate || null,
        concepts: processConcepts(task.concepts || []),
        assets: processAssets(task.assets || []),
        approvalStatus: 'PENDING',
        feedback: null,
        approvedAt: null,
        revisionTaskId: null,
      }));
    };

    const processMilestones = (milestones: any[]) => {
      return milestones.map((milestone: any) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description || null,
        status: milestone.status || 'PENDING',
        deadline: milestone.deadline || null,
        budget: milestone.budget || null,
        currency: milestone.currency || 'USD',
        order: milestone.order || 0,
        tasks: processTasks(milestone.tasks || []),
        approvalStatus: 'PENDING',
        feedback: null,
        approvedAt: null,
        revisionTaskId: null,
      }));
    };

    // Parse feedback from reviewNotes
    let feedbackData = null;
    if (reviewLink.reviewNotes) {
      try {
        const parsed = JSON.parse(reviewLink.reviewNotes);
        feedbackData = {
          overview: parsed.overview || null,
          brief: parsed.brief || null,
          overall: parsed.overall || null,
          milestones: parsed.milestones || null,
          concepts: parsed.concepts || null,
        };
      } catch {
        feedbackData = { overall: reviewLink.reviewNotes };
      }
    }

    const projectData = {
      id: project.id,
      name: project.name,
      projectName: project.projectName || project.name,
      description: project.projectStory || null,
      status: project.status || 'ACTIVE',
      targetDeadline: project.targetDeadline || null,
      totalValue: project.totalValue || 0,
      currency: project.currency || 'USD',
      clientName: project.client?.clientName || 'Unknown Client',
      agencyName: project.agency?.agencyName || 'Unknown Agency',
      brief: project.brief ? {
        id: project.brief.id,
        title: project.brief.title,
        status: project.brief.status,
        objectives: project.brief.objectives,
        audience: project.brief.audience,
        keyMessage: project.brief.keyMessage,
        deliverables: project.brief.deliverables || [],
        references: project.brief.references || [],
        budget: project.brief.budget,
      } : null,
      milestones: processMilestones(project.milestones || []),
      tasks: processTasks(project.tasks || []),
      concepts: processConcepts(project.concepts || []),
      approvalStatus: 'PENDING',
      feedback: null,
      approvedAt: null,
      revisionTaskId: null,
      feedbackData: feedbackData,
    };

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
        reviewedBy: reviewLink.reviewedBy,
        reviewerEmail: reviewLink.reviewerEmail,
        feedbackData: feedbackData,
        reviewScope: 'PROJECT',
        storageInfo: {
          strategy: reviewLink.agency.storageStrategy,
          agencyId: reviewLink.agencyId,
        },
      },
      project: projectData,
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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const {
      approvals,
      projectFeedback,
      reviewerName,
      reviewerEmail
    } = body;

    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token },
      include: {
        concept: {
          include: {
            project: {
              include: projectTreeInclude,
            },
          },
        },
        agency: {
          include: {
            users: {
              where: {
                role: {
                  in: ['ADMIN', 'SUPERADMIN', 'OPERATOR', 'TEAMLEADER'],
                },
              },
              take: 1,
              select: {
                id: true,
              },
            },
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

    const project = reviewLink.concept.project;
    // Flat map of every asset across the whole project tree, not just this
    // review link's own concept — this is the fix: assets from milestones,
    // direct tasks, and direct concepts were previously invisible here.
    const allAssetsMap = buildAssetMap(project);

    const processedApprovals = [];
    const notifications = [];

    // Process approvals
    for (const approval of approvals || []) {
      const { id, status, feedback, generalFeedback } = approval;

      // Handle brief approval
      if (id.startsWith('brief-')) {
        const briefId = id.replace('brief-', '');

        await prisma.creativeBrief.update({
          where: { id: briefId },
          data: {
            status: status === 'APPROVED' ? 'APPROVED' : 'REVISIONS_REQUIRED',
          },
        });

        if (status === 'REJECTED' || status === 'REVISIONS_REQUESTED') {
          const revisionTask = await prisma.task.create({
            data: {
              taskNo: `REV-${Date.now()}`,
              taskType: 'REVISION',
              title: `Brief revisions requested for ${project.name}`,
              description: feedback || 'Please revise the project brief based on client feedback.',
              status: 'PENDING',
              priority: 'HIGH',
              projectId: reviewLink.concept.projectId,
              agencyId: reviewLink.agencyId,
            },
          });

          notifications.push({
            type: 'REVISION_REQUESTED',
            title: `Brief revisions requested`,
            message: `${reviewerName || 'Client'} requested brief revisions: ${feedback || 'No specific feedback provided'}`,
            taskId: revisionTask.id,
          });
        }

        processedApprovals.push({
          id,
          type: 'BRIEF',
          status,
          approvedAt: status === 'APPROVED' ? new Date() : null,
        });

        continue;
      }

      // Handle asset approvals — look up across the whole project tree,
      // not just reviewLink.concept's own assets.
      const asset = allAssetsMap.get(id);
      if (!asset) continue; // not an asset id (could be a milestone/task/concept id with no persistence target)

      const latestVersion = asset.versions?.[0];

      // Update or create approval record
      const approvalRecord = await prisma.reviewLinkAssetApproval.upsert({
        where: {
          reviewLinkId_assetId: {
            reviewLinkId: reviewLink.id,
            assetId: id,
          },
        },
        update: {
          status,
          feedback: feedback || null,
          generalFeedback: generalFeedback || null,
          approvedAt: status === 'APPROVED' ? new Date() : undefined,
          approvedBy: reviewerName || reviewerEmail || 'Anonymous',
          versionId: latestVersion?.id,
        },
        create: {
          reviewLinkId: reviewLink.id,
          assetId: id,
          status,
          feedback: feedback || null,
          generalFeedback: generalFeedback || null,
          approvedAt: status === 'APPROVED' ? new Date() : undefined,
          approvedBy: reviewerName || reviewerEmail || 'Anonymous',
          versionId: latestVersion?.id,
        },
      });

      // Also update the CreativeAssetVersion feedback
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
            feedback: feedback || generalFeedback || null,
          },
        });

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
            },
          });

          await prisma.reviewLinkAssetApproval.update({
            where: { id: approvalRecord.id },
            data: { revisionTaskId: revisionTask.id },
          });

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

    // Store ALL feedback as structured JSON
    const feedbackJSON = {
      overview: projectFeedback?.overview || null,
      brief: projectFeedback?.brief || null,
      overall: projectFeedback?.overall || null,
      milestones: projectFeedback?.milestones || null,
      concepts: projectFeedback?.concepts || null,
    };

    // Update review link with all feedback
    await prisma.reviewLink.update({
      where: { id: reviewLink.id },
      data: {
        reviewedAt: new Date(),
        reviewNotes: JSON.stringify(feedbackJSON),
        reviewedBy: reviewerName || reviewerEmail || 'Anonymous',
        reviewerEmail: reviewerEmail || null,
        assetApprovals: processedApprovals
          .filter((a): a is typeof a & { assetId: string } => 'assetId' in a && !!a.assetId)
          .reduce((acc, a) => {
            acc[a.assetId] = a.status;
            return acc;
          }, {} as Record<string, string>),
      },
    });

    // Send notifications
    const agencyUsers = reviewLink.agency.users || [];
    const adminUserId = agencyUsers.length > 0 ? agencyUsers[0].id : null;

    for (const notification of notifications) {
      if (adminUserId) {
        await prisma.notification.create({
          data: {
            title: notification.title,
            message: notification.message,
            type: notification.type === 'APPROVED' ? 'SUCCESS' : 'ALERT',
            actionUrl: notification.taskId
              ? `/dashboard/tasks/${notification.taskId}`
              : `/dashboard/projects/${reviewLink.concept.projectId}/concepts/${reviewLink.concept.id}/assets/${notification.assetId}`,
            userId: adminUserId,
            agencyId: reviewLink.agencyId,
          },
        });
      }
    }

    const allApproved = processedApprovals.every((a) => a.status === 'APPROVED');

    return NextResponse.json({
      success: true,
      message: allApproved ? 'All items approved!' : 'Review submitted successfully',
      processedApprovals,
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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

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