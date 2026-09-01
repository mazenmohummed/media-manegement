import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    });

    // Get tasks that have procurement activity (planned expenses or quotations)
    const tasks = await prisma.task.findMany({
      where: {
        agencyId: user?.agencyId,
        OR: [
          {
            plannedExpenses: {
              some: {},
            },
          },
          {
            quotations: {
              some: {},
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectName: true,
          },
        },
        plannedExpenses: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalEstimated: true,
          },
        },
        quotations: {
          select: {
            id: true,
            quotationNo: true,
            status: true,
            amount: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching procurement tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procurement tasks' },
      { status: 500 }
    );
  }
}