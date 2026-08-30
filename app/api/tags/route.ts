// app/api/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/tags ──────────────────────────────────────────────────────────
export const GET = withAuthGuard("task:read", async (req: NextRequest, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const tags = await db.tag.findMany({
      where: {
        agencyId,
        ...(q && { name: { contains: q, mode: "insensitive" } }),
      },
      include: {
        _count: {
          select: { tasks: true, projects: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error("[GET_TAGS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tags" },
      { status: 500 }
    );
  }
});

// ─── POST /api/tags ──────────────────────────────────────────────────────────
export const POST = withAuthGuard("task:create", async (req: NextRequest, { agencyId }) => {
  try {
    const body = await req.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    // Check if tag already exists for this agency
    const existing = await db.tag.findFirst({
      where: {
        agencyId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 400 });
    }

    const tag = await db.tag.create({
      data: {
        name: name.trim(),
        color: color || "#6366F1",
        agencyId,
      },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error: any) {
    console.error("[CREATE_TAG_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create tag" },
      { status: 500 }
    );
  }
});

// ─── PUT /api/tags ──────────────────────────────────────────────────────────
export const PUT = withAuthGuard("task:update", async (req: NextRequest, { agencyId }) => {
  try {
    const body = await req.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const tag = await db.tag.findFirst({
      where: { id, agencyId },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updated = await db.tag.update({
      where: { id },
      data: {
        name: name.trim(),
        color: color || "#6366F1",
      },
    });

    return NextResponse.json({ success: true, tag: updated });
  } catch (error: any) {
    console.error("[UPDATE_TAG_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tag" },
      { status: 500 }
    );
  }
});

// ─── DELETE /api/tags ────────────────────────────────────────────────────────
export const DELETE = withAuthGuard("task:delete", async (req: NextRequest, { agencyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    const db = getScopedPrisma(agencyId);

    const tag = await db.tag.findFirst({
      where: { id, agencyId },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await db.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Tag deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE_TAG_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete tag" },
      { status: 500 }
    );
  }
});