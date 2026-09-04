// app/api/tasks/[taskId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

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
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch all review approvals linked to this task through concepts and assets
    const approvals = await db.reviewLinkAssetApproval.findMany({
      where: {
        creativeAsset: {
          concept: {
            taskId: taskId,
          },
        },
        agencyId: session.user.agencyId,
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
            concept: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(approvals);

  } catch (error) {
    console.error('Error fetching task reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task reviews' },
      { status: 500 }
    );
  }
}