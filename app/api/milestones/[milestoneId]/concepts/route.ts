// app/api/milestones/[milestoneId]/concepts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestoneId } = await params;

    const concepts = await prisma.concept.findMany({
      where: {
        OR: [
          { milestoneId: milestoneId },
          { task: { milestoneId: milestoneId } }
        ],
        agencyId: session.user.agencyId,
        status: { not: 'ARCHIVED' },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ concepts });

  } catch (error) {
    console.error('Error fetching milestone concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}