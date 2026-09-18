// app/api/tasks/[taskId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    // Verify task exists and belongs to agency
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get all concept IDs associated with this task.
    // Concepts can be linked directly to the task or through a milestone.
    const concepts = await prisma.concept.findMany({
      where: {
        OR: [
          { taskId: taskId }, // Direct link
          {
            milestone: {
              tasks: {
                some: { id: taskId }, // Through milestone
              },
            },
          },
        ],
        agencyId: session.user.agencyId,
      },
      select: { id: true },
    });

    const conceptIdList = concepts.map((c) => c.id);

    if (conceptIdList.length === 0) {
      return NextResponse.json([]);
    }

    // ✅ Anchor on ReviewLink (not ReviewLinkAssetApproval) so task/project-level
    // reviews show up even when the client didn't approve any individual asset.
    const reviewLinks = await prisma.reviewLink.findMany({
      where: {
        conceptId: { in: conceptIdList },
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            clientName: true,
            email: true,
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
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
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse reviewNotes once per ReviewLink and flatten to the shape the UI expects
    const enriched = reviewLinks.map((link) => {
      let reviewNotes: any = null;
      let sectionStatuses: Record<string, string> | null = null;

      if (link.reviewNotes) {
        try {
          const parsed = JSON.parse(link.reviewNotes);
          reviewNotes = parsed;
          sectionStatuses = parsed.sectionStatuses ?? null;
        } catch {
          reviewNotes = { overall: link.reviewNotes };
        }
      }

      return {
        reviewLink: {
          id: link.id,
          token: link.token,
          status: link.status,
          isActive: link.isActive,
          reviewedAt: link.reviewedAt,
          reviewNotes: link.reviewNotes,
          createdAt: link.createdAt,
          client: link.client,
          concept: link.concept,
        },
        reviewNotes,
        sectionStatuses,
        // Per-asset approvals if any exist; empty is fine — task-level feedback
        // still comes through via sectionStatuses/reviewNotes above.
        assetApprovals: link.reviewLinkAssetApprovals,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching task reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task reviews' },
      { status: 500 }
    );
  }
}