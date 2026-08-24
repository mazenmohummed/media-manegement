"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  Milestone,
  ArrowLeft,
  Folder,
  BarChart3,
  TrendingUp,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MilestoneItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  order: number;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  project: { id: string; name: string; projectNo: string | null } | null;
  tasks: { id: string; status: string; progress: number }[];
  _count: { tasks: number };
}

interface ProjectGroup {
  project: { id: string; name: string; projectNo: string | null } | null;
  milestones: MilestoneItem[];
}

type StatusConfig = Record<string, { label: string; color: string; icon: React.ReactNode }>;

const statusConfig: StatusConfig = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: <Clock className="w-3 h-3" /> },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: <TrendingUp className="w-3 h-3" /> },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800", icon: <XCircle className="w-3 h-3" /> },
};

export default function MilestonesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/milestones?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error("Failed to load milestones:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, searchQuery]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const filteredMilestones = milestones.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.description?.toLowerCase().includes(q) ?? false)
    );
  });

  // Group by project
  const grouped: ProjectGroup[] = [];
  const projectMap = new Map<string, ProjectGroup>();

  filteredMilestones.forEach((m) => {
    const pid = m.project?.id ?? "ungrouped";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        project: m.project,
        milestones: [],
      });
    }
    projectMap.get(pid)!.milestones.push(m);
  });

  projectMap.forEach((g) => grouped.push(g));

  // Overall stats
  const totalTasks = milestones.reduce((sum, m) => sum + m.totalTasks, 0);
  const completedTasks = milestones.reduce((sum, m) => sum + m.completedTasks, 0);
  const avgProgress = milestones.length > 0
    ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
    : 0;
      return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {projectId && (
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Project
            </Link>
          )}
          <div className="flex items-center gap-3">
            <Milestone className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-zinc-100">Milestones</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "board" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <Link
            href={projectId ? `/dashboard/milestones/new?projectId=${projectId}` : "/dashboard/milestones/new"}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
          >
            <Plus className="w-4 h-4" /> New Milestone
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-950/30 border border-purple-800/40 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100">{milestones.length}</p>
            <p className="text-xs text-zinc-500">Milestones</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100">{completedTasks}/{totalTasks}</p>
            <p className="text-xs text-zinc-500">Tasks Completed</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950/30 border border-blue-800/40 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100">{avgProgress}%</p>
            <p className="text-xs text-zinc-500">Avg Progress</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milestones by name or description..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Filter className="w-3.5 h-3.5" />
          <span>{filteredMilestones.length} milestones</span>
          {projectId && <span className="text-zinc-600">· filtered by project</span>}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      ) : filteredMilestones.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-16 text-center">
          <Milestone className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-500 font-medium">No milestones found.</p>
          <p className="text-xs text-zinc-600 mt-1">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Create a milestone to track project phases."}
          </p>
        </div>
      ) : viewMode === "board" ? (
        <BoardView grouped={grouped} statusConfig={statusConfig} />
      ) : (
        <ListView grouped={grouped} statusConfig={statusConfig} />
      )}
    </div>
  );
}
function BoardView({
  grouped,
  statusConfig,
}: {
  grouped: ProjectGroup[];
  statusConfig: StatusConfig;
}) {
  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <div key={group.project?.id ?? "ungrouped"} className="space-y-3">
          {group.project && (
            <div className="flex items-center gap-3">
              <Folder className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-zinc-200">{group.project.name}</h2>
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                {group.milestones.length} milestones
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.milestones.map((m) => (
              <MilestoneCard key={m.id} milestone={m} statusConfig={statusConfig} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  grouped,
  statusConfig,
}: {
  grouped: ProjectGroup[];
  statusConfig: StatusConfig;
}) {
  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.project?.id ?? "ungrouped"} className="space-y-2">
          {group.project && (
            <div className="flex items-center gap-3 px-1">
              <Folder className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-zinc-200">{group.project.name}</h2>
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                {group.milestones.length}
              </Badge>
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {group.milestones.map((m, idx) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                statusConfig={statusConfig}
                isLast={idx === group.milestones.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneCard({
  milestone,
  statusConfig,
}: {
  milestone: MilestoneItem;
  statusConfig: StatusConfig;
}) {
  const status = statusConfig[milestone.status] || statusConfig.PENDING;
  const isOverdue = milestone.deadline && new Date(milestone.deadline) < new Date() && milestone.status !== "COMPLETED";

  return (
    <Link
      href={`/dashboard/milestones/${milestone.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
          {status.icon}
          {status.label}
        </Badge>
        {isOverdue && (
          <Badge className="bg-red-950/30 text-red-400 border-red-800 text-[10px] px-1.5 py-0">
            Overdue
          </Badge>
        )}
      </div>

      <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 line-clamp-1 mb-1">
        {milestone.name}
      </h3>
      {milestone.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{milestone.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Progress</span>
          <span className="font-mono">{milestone.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
        <span>{milestone.completedTasks}/{milestone.totalTasks} tasks</span>
        {milestone.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(milestone.deadline).toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}

function MilestoneRow({
  milestone,
  statusConfig,
  isLast,
}: {
  milestone: MilestoneItem;
  statusConfig: StatusConfig;
  isLast: boolean;
}) {
  const status = statusConfig[milestone.status] || statusConfig.PENDING;
  const isOverdue = milestone.deadline && new Date(milestone.deadline) < new Date() && milestone.status !== "COMPLETED";

  return (
    <Link
      href={`/dashboard/milestones/${milestone.id}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${
        !isLast ? "border-b border-zinc-800/60" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1 shrink-0`}>
          {status.icon}
          {status.label}
        </Badge>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
            {milestone.name}
          </h3>
          {milestone.description && (
            <p className="text-xs text-zinc-500 truncate">{milestone.description}</p>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 w-40 shrink-0">
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${milestone.progress}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{milestone.progress}%</span>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0 w-24 text-[10px] text-zinc-500">
        <CheckCircle2 className="w-3 h-3" />
        {milestone.completedTasks}/{milestone.totalTasks}
      </div>

      <div className="hidden lg:block text-[10px] text-zinc-500 shrink-0 w-28 text-right">
        {milestone.deadline ? (
          <span className={isOverdue ? "text-red-400" : ""}>
            {new Date(milestone.deadline).toLocaleDateString()}
          </span>
        ) : (
          "—"
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
    </Link>
  );
}