// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

// ─── GET /api/projects ──────────────────────────────────────────────────────
export const GET = withAuthGuard(
  "project:read",
  async (req: NextRequest, { agencyId }) => {
    try {
      const db = getScopedPrisma(agencyId);
      const { searchParams } = new URL(req.url);

      const status = searchParams.get("status") as ProjectStatus | null;
      const search = searchParams.get("search") || "";
      const clientId = searchParams.get("clientId") || "";
      const tagId = searchParams.get("tagId") || "";

      const whereClause: any = { agencyId, deletedAt: null };
      if (status) whereClause.status = status;
      if (clientId) whereClause.clientId = clientId;
      if (tagId) {
        whereClause.tags = {
          some: { id: tagId },
        };
      }
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { projectName: { contains: search, mode: "insensitive" } },
          { projectNo: { contains: search, mode: "insensitive" } },
          { client: { clientName: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [projects, clients, stats] = await Promise.all([
        db.project.findMany({
          where: whereClause,
          include: {
            client: { select: { id: true, clientName: true } },
            contract: { select: { id: true, contractNo: true } },
            // ✅ many-to-many: `campaigns`, not `campaign`
            campaigns: { select: { id: true, name: true } },
            tags: { select: { id: true, name: true, color: true } },
            _count: { select: { tasks: true, milestones: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.client.findMany({
          where: { agencyId },
          select: { id: true, clientName: true },
          orderBy: { clientName: "asc" },
        }),
        db.project.aggregate({
          where: { agencyId, deletedAt: null },
          _sum: { totalValue: true },
          _count: { id: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        projects,
        clients,
        stats,
      });
    } catch (error: any) {
      console.error("[GET_PROJECTS_ERROR]", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch projects" },
        { status: 500 }
      );
    }
  }
);

// ─── POST /api/projects ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      projectName,
      clientId,
      contractId,
      campaignId,
      assignedUserId,
      targetDeadline,
      totalValue,
      currency,
      status,
      projectStory,
      cloudLink,
      tagIds,
    } = body;

    if (!name?.trim() || !clientId) {
      return NextResponse.json(
        { error: "Project name and client are required" },
        { status: 400 }
      );
    }

    const client = await db.client.findFirst({
      where: { id: clientId, agencyId: session.user.agencyId },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (contractId) {
      const contract = await db.contract.findFirst({
        where: { id: contractId, agencyId: session.user.agencyId },
      });
      if (!contract) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }
    }

    if (campaignId) {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, agencyId: session.user.agencyId },
      });
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }
    }

    if (assignedUserId) {
      const userCheck = await db.user.findFirst({
        where: {
          id: assignedUserId,
          agencyId: session.user.agencyId,
          isActive: true,
        },
      });
      if (!userCheck) {
        return NextResponse.json(
          { error: "Invalid assignee selected" },
          { status: 400 }
        );
      }
    }

    if (tagIds && tagIds.length > 0) {
      const validTags = await db.tag.findMany({
        where: {
          id: { in: tagIds },
          agencyId: session.user.agencyId,
        },
      });
      if (validTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: "One or more tags are invalid" },
          { status: 400 }
        );
      }
    }

    const count = await db.project.count({
      where: { agencyId: session.user.agencyId },
    });
    const projectNo = `PRJ-${String(count + 1).padStart(4, "0")}`;

    const project = await db.project.create({
      data: {
        projectNo,
        name: name.trim(),
        projectName: projectName?.trim() || name.trim(),
        status: status || "ACTIVE",
        totalValue: totalValue || 0,
        currency: currency || "EGP",
        targetDeadline: targetDeadline ? new Date(targetDeadline) : null,
        projectStory: projectStory?.trim() || null,
        cloudLink: cloudLink?.trim() || null,
        clientId,
        contractId: contractId || null,
        agencyId: session.user.agencyId,

        // ✅ many-to-many relation: connect campaigns, not assign campaignId
        campaigns: campaignId
          ? { connect: [{ id: campaignId }] }
          : undefined,

        tags: tagIds?.length
          ? { connect: tagIds.map((id: string) => ({ id })) }
          : undefined,

        resourceAllocations: assignedUserId
          ? {
              create: {
                userId: assignedUserId,
                agencyId: session.user.agencyId,
                startDate: new Date(),
                allocationPercent: 100.0,
              },
            }
          : undefined,
      },
      include: {
        client: { select: { id: true, clientName: true } },
        contract: { select: { id: true, contractNo: true } },
        campaigns: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } },
        resourceAllocations: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { tasks: true, milestones: true } },
      },
    });

    if (assignedUserId) {
      await db.notification.create({
        data: {
          title: "Project Assigned",
          message: `You have been assigned to project: ${project.projectName}`,
          type: "ASSIGNMENT",
          userId: assignedUserId,
          agencyId: session.user.agencyId,
          actionUrl: `/dashboard/projects/${project.id}`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        project,
        message: "Project created successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create project" },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PUT and DELETE have been REMOVED from this file.
//
// They belong in app/api/projects/[projectId]/route.ts because they use a
// dynamic `projectId` param. Move them there verbatim, keeping the
// `Promise<{ projectId: string }>` params type.
// ═════════════════════════════════════════════════════════════════════════════