import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const contractId = searchParams.get("contractId");
  const q = searchParams.get("q");

  const where: any = {
    agencyId: session.user.agencyId,
    deletedAt: null,
  };

  if (status && status !== "ALL") where.status = status;
  if (clientId) where.clientId = clientId;
  if (contractId) where.contractId = contractId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { projectName: { contains: q, mode: "insensitive" } },
      { projectNo: { contains: q, mode: "insensitive" } },
    ];
  }

  const projects = await db.project.findMany({
    where,
    select: {
      id: true,
      name: true,
      projectName: true,
      projectNo: true,
      status: true,
      totalValue: true,
      currency: true,
      targetDeadline: true,
      clientId: true,
      contractId: true,
      campaignId: true,
      client: { select: { id: true, clientName: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ projects });
}

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
    } = body;

    if (!name?.trim() || !clientId) {
      return NextResponse.json(
        { error: "Project name and client are required" },
        { status: 400 }
      );
    }

    if (assignedUserId) {
      const userCheck = await db.user.findFirst({
        where: { id: assignedUserId, agencyId: session.user.agencyId, role: { in: ["ADMIN", "OPERATOR"] } },
      });
      if (!userCheck) {
        return NextResponse.json({ error: "Invalid assignee selected" }, { status: 400 });
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
        campaignId: campaignId || null,
        agencyId: session.user.agencyId,
        // Assign the user via ResourceAllocation instead of a Project.userId column
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
        resourceAllocations: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err: any) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create project" },
      { status: 500 }
    );
  }
}