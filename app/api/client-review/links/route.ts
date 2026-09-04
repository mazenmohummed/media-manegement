// app/api/client-review/links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// app/api/client-review/links/route.ts - POST handler
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    const body = await req.json();
    const { conceptId, clientId, expiresInDays, maxViews } = body;

    if (!conceptId || !clientId) {
      return NextResponse.json(
        { error: 'Concept ID and Client ID are required' },
        { status: 400 }
      );
    }

    // Verify concept exists and belongs to agency/client
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        agencyId,
        project: {
          clientId,
        },
      },
      include: {
        project: {
          select: {
            projectName: true,
            clientId: true,
            client: {
              select: {
                clientName: true,
              },
            },
          },
        },
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found or does not belong to this client' },
        { status: 404 }
      );
    }

    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const reviewLink = await prisma.reviewLink.create({
      data: {
        token: generateToken(),
        conceptId,
        clientId,
        agencyId,
        expiresAt,
        maxViews: maxViews || 0,
        viewCount: 0,
        isActive: true,
        assetApprovals: concept.assets.reduce((acc, asset) => {
          acc[asset.id] = 'PENDING';
          return acc;
        }, {} as Record<string, string>),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reviewUrl = `${baseUrl}/client-review/${reviewLink.token}`;

    // ✅ Return with client name
    return NextResponse.json({
      id: reviewLink.id,
      token: reviewLink.token,
      url: reviewUrl,
      expiresAt: reviewLink.expiresAt,
      maxViews: reviewLink.maxViews,
      concept: {
        id: concept.id,
        name: concept.name,
        projectName: concept.project.projectName,
        assetCount: concept.assets.length,
      },
      client: {
        id: concept.project.clientId,
        name: concept.project.client.clientName,
      },
    });
  } catch (error) {
    console.error('Error creating review link:', error);
    return NextResponse.json(
      { error: 'Failed to create review link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get('conceptId');

    const where: any = { agencyId };
    if (conceptId) {
      where.conceptId = conceptId;
    }

    const links = await prisma.reviewLink.findMany({
      where,
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            status: true,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching review links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review links' },
      { status: 500 }
    );
  }
}