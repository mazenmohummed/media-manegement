import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

export const GET = withAuthGuard("project:read", async (req: NextRequest, { agencyId }, context) => {
  const { projectId } = await context.params;
  const db = getScopedPrisma(agencyId);

  const milestones = await db.milestone.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ success: true, milestones });
});

export const POST = withAuthGuard("project:update", async (req: NextRequest, { agencyId }, context) => {
  const { projectId } = await context.params;
  const body = await req.json();
  const { name, description, budget, deadline, status } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Milestone name is required" }, { status: 400 });
  }

  const db = getScopedPrisma(agencyId);

  const project = await db.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const count = await db.milestone.count({ where: { projectId } });

  const milestone = await db.milestone.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      budget: budget ? Number(budget) : 0,
      deadline: deadline ? new Date(deadline) : null,
      status: status ?? "PENDING",
      order: count,
      projectId,
      agencyId,
    },
  });

  return NextResponse.json({ success: true, milestone }, { status: 201 });
});