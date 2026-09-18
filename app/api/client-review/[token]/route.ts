// app/api/review-links/[token]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // 🔒 SECURITY: Fetch the link with only the required fields
  const reviewLink = await db.reviewLink.findFirst({
    where: {
      token: token,
      isActive: true,
      deletedAt: null,
      status: "ACTIVE",
      // 🔒 EXPIRY CHECK
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      concept: {
        include: {
          // ✅ LINKED CONCEPT + PROJECT + MILESTONE + TASK
          project: {
            select: {
              id: true,
              name: true,
              projectName: true,
            },
          },
          milestone: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          // ✅ ORPHANED ASSET PREVENTION: Only fetch active assets
          assets: {
            where: {
              deletedAt: null, // Prevent orphaned assets
            },
            include: {
              versions: {
                where: {
                  deletedAt: null,
                },
                orderBy: { versionNo: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!reviewLink) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  // ✅ FIX: Use nullish coalescing to handle nullable maxViews
  const maxViews = reviewLink.maxViews ?? 0; // If null, treat as 0 (unlimited)

  // 🔒 MAX VIEWS CHECK
  if (maxViews > 0 && reviewLink.viewCount >= maxViews) {
    await db.reviewLink.update({
      where: { id: reviewLink.id },
      data: { isActive: false, status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Maximum views reached" }, { status: 403 });
  }

  // Increment view count atomically
  await db.reviewLink.update({
    where: { id: reviewLink.id },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({
    id: reviewLink.id,
    conceptId: reviewLink.conceptId,
    token: reviewLink.token,
    concept: {
      id: reviewLink.concept.id,
      name: reviewLink.concept.name,
      // ✅ Return linked context
      project: reviewLink.concept.project,
      milestone: reviewLink.concept.milestone,
      task: reviewLink.concept.task,
      assets: reviewLink.concept.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        version: asset.versions[0], // Only show latest active version
      })),
    },
  });
}