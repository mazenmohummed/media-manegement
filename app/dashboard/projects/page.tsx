import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  Plus,
  Building,
  Calendar,
  DollarSign,
  Briefcase,
  Search,
  Filter,
  ArrowUpRight,
  Layers,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatus } from "@prisma/client";

interface SearchParams {
  status?: ProjectStatus;
  search?: string;
  clientId?: string;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { status, search, clientId } = await searchParams;

  const whereClause: any = { agencyId, deletedAt: null };
  if (status) whereClause.status = status;
  if (clientId) whereClause.clientId = clientId;
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
        campaign: { select: { id: true, name: true } },
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

  const statusColors: Record<ProjectStatus, string> = {
    DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700",
    ACTIVE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ON_HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
    ARCHIVED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Projects</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Active deployments, contract-linked executions, and production
            tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/templates">
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
            >
              <FileText className="w-4 h-4" /> Templates
            </Button>
          </Link>
          <Link href="/dashboard/projects/new">
            <Button className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Total Projects
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {stats._count.id}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Pipeline Value
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {stats._sum.totalValue?.toLocaleString() ?? "0"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Active
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {
              projects.filter((p) => p.status === ProjectStatus.ACTIVE).length
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search projects, clients, or numbers..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              name="status"
              defaultValue={status || ""}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Statuses</option>
              {Object.values(ProjectStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-zinc-500" />
            <select
              name="clientId"
              defaultValue={clientId || ""}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Filter
          </Button>

          {(status || search || clientId) && (
            <Link href="/dashboard/projects">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Clear
              </Button>
            </Link>
          )}
        </form>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all space-y-4 block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                    {project.projectName || project.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {project.projectNo || project.id.slice(0, 8)}
                  </p>
                </div>
                <Badge
                  className={`${statusColors[project.status]} shrink-0`}
                >
                  {project.status}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">
                    {project.client?.clientName || "No client"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    {project.currency} {project.totalValue.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {project.targetDeadline
                      ? new Date(project.targetDeadline).toLocaleDateString()
                      : "No deadline"}
                  </span>
                </div>

                {project.contract && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">
                      {project.contract.contractNo}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {project._count.milestones} milestones
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {project._count.tasks} tasks
                  </span>
                </div>
                <span className="text-purple-400 flex items-center gap-1 group-hover:underline">
                  View <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-200 font-medium">No projects found</h3>
          <p className="text-sm text-zinc-500 mt-1">
            {status || search || clientId
              ? "Try adjusting your filters."
              : "Create a project from a contract or start from a template."}
          </p>
        </div>
      )}
    </div>
  );
}