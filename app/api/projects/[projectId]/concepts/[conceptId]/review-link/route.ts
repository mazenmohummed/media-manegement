// app/api/projects/[projectId]/concepts/[conceptId]/review-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Await params before using them
    const { projectId, conceptId } = await params;

    // ✅ Validate params
    if (!projectId || !conceptId) {
      return NextResponse.json(
        { error: 'Project ID and Concept ID are required' },
        { status: 400 }
      );
    }

    // Verify concept belongs to project and agency
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        projectId: projectId,
        agencyId: session.user.agencyId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    if (!concept.project.client) {
      return NextResponse.json(
        { error: 'No client assigned to this project' },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // ✅ Create review link - use connect pattern or ensure conceptId is properly set
    const reviewLink = await prisma.reviewLink.create({
      data: {
        token,
        // ✅ Use connect pattern for concept relation
        concept: {
          connect: { id: conceptId },
        },
        client: {
          connect: { id: concept.project.client.id },
        },
        agency: {
          connect: { id: session.user.agencyId },
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        maxViews: 10,
      },
    });

    // Create pending approvals for all assets in concept
    const assets = await prisma.creativeAsset.findMany({
      where: { conceptId: conceptId },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    // ✅ Create approvals with proper relations
    for (const asset of assets) {
      const latestVersion = asset.versions[0];
      await prisma.reviewLinkAssetApproval.create({
        data: {
          reviewLink: {
            connect: { id: reviewLink.id },
          },
          creativeAsset: {
            connect: { id: asset.id },
          },
          ...(latestVersion && {
            creativeAssetVersion: {
              connect: { id: latestVersion.id },
            },
          }),
          status: 'PENDING',
          agency: {
            connect: { id: session.user.agencyId },
          },
        },
      });
    }

    // ✅ Update concept status to IN_REVIEW if it's DRAFT
    if (concept.status === 'DRAFT') {
      await prisma.concept.update({
        where: { id: conceptId },
        data: { status: 'IN_REVIEW' },
      });
    }

    const reviewLinkUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/client-review/${reviewLink.token}`;

    return NextResponse.json({
      success: true,
      id: reviewLink.id,
      token: reviewLink.token,
      link: reviewLinkUrl,
      assetCount: assets.length,
      message: `Review link generated with ${assets.length} assets`,
    });

  } catch (error) {
    console.error('Error generating review link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate review link' },
      { status: 500 }
    );
  }
}