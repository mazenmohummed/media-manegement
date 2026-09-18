// components/projects/ProjectsPageClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Tag as TagIcon,
  Loader2,
  X,
  Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatus } from "@prisma/client";
import { TagManager } from "@/components/tags/TagManager";

// ─── Types ──────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  campaignNo?: string | null;
  status?: string;
}

interface Project {
  id: string;
  projectName: string | null;
  name: string;
  projectNo: string | null;
  status: ProjectStatus;
  currency: string;
  totalValue: number;
  targetDeadline: string | null;
  client: { id: string; clientName: string } | null;
  contract: { id: string; contractNo: string | null } | null;
  campaigns: Campaign[];
  // Keep `campaign` for backward compatibility with other components
  campaign: { id: string; name: string } | null;
  tags: { id: string; name: string; color: string }[];
  _count: { tasks: number; milestones: number };
}

interface Stats {
  _count: { id: number };
  _sum: { totalValue: number | null };
}

interface Client {
  id: string;
  clientName: string;
}

interface ProjectsPageClientProps {
  initialProjects: Project[];
  initialClients: Client[];
  initialStats: Stats;
}

// ─── Constants ──────────────────────────────────────────────────────────

const statusColors: Record<ProjectStatus, string> = {
  DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700",
  ACTIVE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ON_HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// ─── Main Component ────────────────────────────────────────────────────

export function ProjectsPageClient({
  initialProjects,
  initialClients,
  initialStats,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [clients] = useState<Client[]>(initialClients);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [tagAssignmentProjectId, setTagAssignmentProjectId] = useState<string | null>(null);
  const [isAssigningTags, setIsAssigningTags] = useState(false);

  // Get filters from URL
  const statusFilter = searchParams.get("status") as ProjectStatus | null;
  const searchQuery = searchParams.get("search") || "";
  const clientFilter = searchParams.get("clientId") || "";
  const tagFilter = searchParams.get("tagId") || "";

  // Check if any filters are active
  const hasFilters = statusFilter || searchQuery || clientFilter || tagFilter;

  const fetchProjects = useCallback(async (params?: URLSearchParams) => {
    setLoading(true);
    try {
      const queryParams = params || new URLSearchParams();
      if (statusFilter) queryParams.set("status", statusFilter);
      if (searchQuery) queryParams.set("search", searchQuery);
      if (clientFilter) queryParams.set("clientId", clientFilter);
      if (tagFilter) queryParams.set("tagId", tagFilter);

      const res = await fetch(`/api/projects?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, clientFilter, tagFilter]);

  useEffect(() => {
    if (hasFilters) {
      fetchProjects();
    } else {
      // Reset to initial data when no filters
      setProjects(initialProjects);
      setStats(initialStats);
    }
  }, [statusFilter, searchQuery, clientFilter, tagFilter, hasFilters, initialProjects, initialStats]);

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/projects${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    router.push("/dashboard/projects");
    setProjects(initialProjects);
    setStats(initialStats);
    setLoading(false);
  };

  const handleTagSelect = (tagId: string) => {
    updateFilters("tagId", tagId);
  };

  const handleTagDeselect = () => {
    updateFilters("tagId", null);
  };

  const assignTagsToProject = async (projectId: string, tagIds: string[]) => {
    setIsAssigningTags(true);
    try {
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });

      if (!projectRes.ok) {
        const error = await projectRes.json();
        throw new Error(error.error || "Failed to assign tags to project");
      }

      const projectData = await projectRes.json();

      // Get all tasks for this project
      const tasksRes = await fetch(`/api/tasks?projectId=${projectId}&limit=1000`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const projectTasks = tasksData.tasks || [];

        const taskUpdatePromises = projectTasks.map((task: any) =>
          fetch(`/api/tasks/${task.id}/tags`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagIds }),
          })
        );

        await Promise.all(taskUpdatePromises);
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, tags: projectData.project.tags || [] }
            : p
        )
      );
      setTagAssignmentProjectId(null);

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 transition-all duration-300';
      toast.textContent = `Tags assigned to project and ${projectData.project._count?.tasks || 0} tasks`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);

    } catch (err: any) {
      console.error("Failed to assign tags:", err);
      alert(err.message || "Failed to assign tags");
    } finally {
      setIsAssigningTags(false);
    }
  };

  const handleTagAssignment = (projectId: string, tagIds: string[]) => {
    assignTagsToProject(projectId, tagIds);
  };

  const activeProjects = projects.filter((p) => p.status === ProjectStatus.ACTIVE).length;

  // ─── Render Campaigns Helper ─────────────────────────────────────────

  const renderCampaigns = (project: Project) => {
    const campaigns = project.campaigns || [];

    if (campaigns.length === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 text-zinc-300">
        <Megaphone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <span className="truncate">
          {campaigns.length === 1 ? (
            campaigns[0].name
          ) : (
            <span>
              {campaigns[0].name}{" "}
              <span className="text-zinc-500">
                +{campaigns.length - 1} more
              </span>
            </span>
          )}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

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
            {activeProjects}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => updateFilters("search", e.target.value || null)}
              placeholder="Search projects, clients, or numbers..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={statusFilter || ""}
              onChange={(e) => updateFilters("status", e.target.value || null)}
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
              value={clientFilter}
              onChange={(e) => updateFilters("clientId", e.target.value || null)}
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
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>

        {/* Tag Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
          <TagIcon className="w-4 h-4 text-zinc-500" />
          <TagManager
            selectedTagIds={tagFilter ? [tagFilter] : []}
            onSelectTag={handleTagSelect}
            onDeselectTag={handleTagDeselect}
            multiSelect={false}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const isTagAssignmentOpen = tagAssignmentProjectId === project.id;
            const projectTagIds = project.tags?.map((t) => t.id) || [];

            return (
              <div
                key={project.id}
                className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all space-y-4 relative"
              >
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="block space-y-4"
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

                  {/* Display Tags with both name and color */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${tag.color}25`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </span>
                      ))}
                      <span className="text-[9px] text-zinc-500 font-medium ml-1">
                        ({project._count.tasks} tasks)
                      </span>
                    </div>
                  )}

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

                    {/* ✅ Campaigns (many-to-many) */}
                    {renderCampaigns(project)}

                    {project.contract && (
                      <div className="flex items-center gap-2 text-zinc-300">
                        <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">
                          {project.contract.contractNo || "No contract number"}
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

                {/* Tag Assignment Button */}
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTagAssignmentProjectId(
                        isTagAssignmentOpen ? null : project.id
                      );
                    }}
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    <span className="ml-1 text-[10px]">
                      {project.tags?.length || 0}
                    </span>
                  </Button>
                </div>

                {/* Tag Assignment Dropdown */}
                {isTagAssignmentOpen && (
                  <div
                    className="absolute top-12 right-3 z-20 w-72 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-300">
                        Assign Tags to Project & Tasks
                      </span>
                      <button
                        onClick={() => setTagAssignmentProjectId(null)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 mb-2">
                      Tags will be applied to all {project._count.tasks} tasks in this project
                    </p>

                    <TagManager
                      selectedTagIds={projectTagIds}
                      onSelectTag={(tagId) => {
                        const newTagIds = [...projectTagIds, tagId];
                        handleTagAssignment(project.id, newTagIds);
                      }}
                      onDeselectTag={(tagId) => {
                        const newTagIds = projectTagIds.filter((id) => id !== tagId);
                        handleTagAssignment(project.id, newTagIds);
                      }}
                      multiSelect={true}
                      onTagsChange={() => {
                        fetchProjects();
                      }}
                    />

                    {isAssigningTags && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <span className="ml-2 text-xs text-zinc-500">
                          Assigning tags to all tasks...
                        </span>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-zinc-800/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-zinc-500 hover:text-zinc-300"
                        onClick={() => setTagAssignmentProjectId(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-200 font-medium">No projects found</h3>
          <p className="text-sm text-zinc-500 mt-1">
            {statusFilter || searchQuery || clientFilter || tagFilter
              ? "Try adjusting your filters."
              : "Create a project from a contract or start from a template."}
          </p>
        </div>
      )}
    </div>
  );
}