// app/dashboard/projects/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";
import { ProjectStatus } from "@prisma/client";

interface SearchParams {
  status?: ProjectStatus;
  search?: string;
  clientId?: string;
  tagId?: string;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { status, search, clientId, tagId } = await searchParams;

  const whereClause: any = { agencyId, deletedAt: null };
  if (status) whereClause.status = status;
  if (clientId) whereClause.clientId = clientId;
  if (tagId) {
    whereClause.tags = {
      some: { id: tagId }
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
        campaigns: {
        select: { 
          id: true, 
          name: true, 
          campaignNo: true,
          status: true,
        },
      },
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

  // ✅ Serialize projects: convert Date objects to ISO strings
  const serializedProjects = projects.map((project) => ({
    id: project.id,
    projectName: project.projectName,
    name: project.name,
    projectNo: project.projectNo,
    status: project.status,
    currency: project.currency,
    totalValue: project.totalValue,
    targetDeadline: project.targetDeadline ? project.targetDeadline.toISOString() : null,
    client: project.client,
    contract: project.contract,
    campaigns: project.campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    campaignNo: c.campaignNo,
    status: c.status,
    })),
    campaign: project.campaigns[0] ? {
      id: project.campaigns[0].id,
      name: project.campaigns[0].name,
    } : null,
    tags: project.tags,
    _count: project._count,
    createdAt: project.createdAt ? project.createdAt.toISOString() : null,
    updatedAt: project.updatedAt ? project.updatedAt.toISOString() : null,
  }));

  // ✅ Serialize stats if needed (though stats don't have Date fields)
  const serializedStats = {
    _count: stats._count,
    _sum: stats._sum,
  };

  return (
    <ProjectsPageClient
      initialProjects={serializedProjects}
      initialClients={clients}
      initialStats={serializedStats}
    />
  );
}