import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// GET: all agency tags + which ones are on this project
export const GET = withAuthGuard("project:read", async (req: NextRequest, { agencyId }, context) => {
  const { projectId } = await context.params;
  const db = getScopedPrisma(agencyId);

  const [allTags, project] = await Promise.all([
    db.tag.findMany({ orderBy: { name: "asc" } }),
    db.project.findFirst({ where: { id: projectId }, select: { tags: { select: { id: true } } } }),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const appliedIds = new Set(project.tags.map((t) => t.id));
  return NextResponse.json({
    success: true,
    tags: allTags.map((t) => ({ ...t, applied: appliedIds.has(t.id) })),
  });
});

// POST: attach a tag (creates a new tag first if tagId is omitted and name is given)
export const POST = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  const { projectId } = await context.params;
  const body = await req.json();
  const { tagId, name, color } = body;

  const db = getScopedPrisma(agencyId);

  const project = await db.project.findFirst({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let resolvedTagId = tagId;
  if (!resolvedTagId) {
    if (!name?.trim()) {
      return NextResponse.json({ error: "tagId or name is required" }, { status: 400 });
    }
    const newTag = await db.tag.create({
      data: { name: name.trim(), color: color ?? "#6366f1", agencyId },
    });
    resolvedTagId = newTag.id;
  }

  await db.project.update({
    where: { id: projectId },
    data: { tags: { connect: { id: resolvedTagId } } },
  });

  return NextResponse.json({ success: true, tagId: resolvedTagId });
});

// DELETE: detach a tag — /api/projects/[projectId]/tags?tagId=xxx
export const DELETE = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  const { projectId } = await context.params;
  const tagId = new URL(req.url).searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId query param is required" }, { status: 400 });

  const db = getScopedPrisma(agencyId);
  const project = await db.project.findFirst({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await db.project.update({
    where: { id: projectId },
    data: { tags: { disconnect: { id: tagId } } },
  });

  return NextResponse.json({ success: true });
});