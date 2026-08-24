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
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  Milestone,
  Tag,
  FolderKanban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  projectName: string;
}

interface Task {
  id: string;
  taskNo: string | null;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  milestoneId: string | null;
  milestone: { id: string; name: string; order: number } | null;
  project: Project | null;
  assignees: { id: string; name: string; avatarUrl: string | null }[];
  category: { id: string; name: string } | null;
  _count: { comments: number; todos: number };
}

interface MilestoneGroup {
  milestone: {
    id: string;
    name: string;
    order: number;
    status: string;
    progress: number;
  };
  tasks: Task[];
}

interface ProjectGroup {
  project: Project;
  milestones: MilestoneGroup[];
  ungroupedTasks: Task[];
}

type StatusConfig = Record<string, { label: string; color: string; icon: React.ReactNode }>;
type PriorityConfig = Record<string, { label: string; color: string }>;

const statusConfig: StatusConfig = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: <Clock className="w-3 h-3" /> },
  ACTIVE: { label: "Active", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: <Clock className="w-3 h-3" /> },
  IN_REVIEW: { label: "In Review", color: "bg-amber-950/40 text-amber-400 border-amber-800", icon: <AlertCircle className="w-3 h-3" /> },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800", icon: <XCircle className="w-3 h-3" /> },
};

const priorityConfig: PriorityConfig = {
  LOW: { label: "Low", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  MEDIUM: { label: "Medium", color: "bg-blue-950/30 text-blue-400 border-blue-800" },
  HIGH: { label: "High", color: "bg-orange-950/30 text-orange-400 border-orange-800" },
  URGENT: { label: "Urgent", color: "bg-red-950/30 text-red-400 border-red-800" },
};

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("projectId") || "ALL";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [flatProjects, setFlatProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [milestoneFilter, setMilestoneFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>(urlProjectId);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter && projectFilter !== "ALL") params.set("projectId", projectFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (milestoneFilter !== "ALL") params.set("milestoneId", milestoneFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setProjectGroups(data.projects || []);
        setFlatProjects(data.rawProjects || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, priorityFilter, milestoneFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (t.title?.toLowerCase().includes(q) ?? false) ||
      (t.taskNo?.toLowerCase().includes(q) ?? false) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  // Extract unique milestone options for filter dropdown
  const allMilestoneOptions = projectGroups.flatMap((pg) => pg.milestones.map((m) => m.milestone));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Tasks</h1>
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
            href={projectFilter !== "ALL" ? `/dashboard/tasks/new?projectId=${projectFilter}` : "/dashboard/tasks/new"}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
          >
            <Plus className="w-4 h-4" /> New Task
          </Link>
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
              placeholder="Search tasks by title, number, or description..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Projects</option>
              {flatProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.projectName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Milestones</option>
              {allMilestoneOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Rendering Structured Hierarchies */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-500 font-medium">No tasks found.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {projectGroups.map((pg) => {
            // Filter milestones and tasks based on active search/filters
            const filteredMilestones = pg.milestones
              .map((m) => ({
                ...m,
                tasks: m.tasks.filter((t) => filteredTasks.some((ft) => ft.id === t.id)),
              }))
              .filter((m) => m.tasks.length > 0 || milestoneFilter === "ALL");

            const filteredUngrouped = pg.ungroupedTasks.filter((t) =>
              filteredTasks.some((ft) => ft.id === t.id)
            );

            if (filteredMilestones.length === 0 && filteredUngrouped.length === 0) return null;

            return (
              <div key={pg.project.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                {/* Project Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="p-2 bg-purple-950/40 border border-purple-800/60 rounded-lg">
                    <FolderKanban className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">
                    {pg.project.name || pg.project.projectName}
                  </h2>
                </div>

                {/* Milestones Nested under Project */}
                <div className="space-y-8 pl-2 sm:pl-4">
                  {filteredMilestones.map((mg) => (
                    <div key={mg.milestone.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Milestone className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">{mg.milestone.name}</h3>
                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                          {mg.tasks.length} tasks
                        </Badge>
                        {mg.milestone.progress > 0 && (
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${mg.milestone.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-500">{mg.milestone.progress}%</span>
                          </div>
                        )}
                      </div>

                      {viewMode === "board" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {mg.tasks.map((task) => (
                            <TaskCard key={task.id} task={task} statusConfig={statusConfig} priorityConfig={priorityConfig} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                          {mg.tasks.map((task, idx) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              statusConfig={statusConfig}
                              priorityConfig={priorityConfig}
                              isLast={idx === mg.tasks.length - 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Project Ungrouped Tasks */}
                  {filteredUngrouped.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Ungrouped Tasks
                      </h3>
                      {viewMode === "board" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredUngrouped.map((task) => (
                            <TaskCard key={task.id} task={task} statusConfig={statusConfig} priorityConfig={priorityConfig} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                          {filteredUngrouped.map((task, idx) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              statusConfig={statusConfig}
                              priorityConfig={priorityConfig}
                              isLast={idx === filteredUngrouped.length - 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, statusConfig, priorityConfig }: { task: Task; statusConfig: StatusConfig; priorityConfig: PriorityConfig }) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={`${priority.color} text-[10px] px-1.5 py-0`}>{priority.label}</Badge>
        <span className="text-[10px] font-mono text-zinc-600">{task.taskNo ?? task.id.slice(0, 8)}</span>
      </div>
      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 line-clamp-2 mb-1">
        {task.title ?? "Untitled Task"}
      </h4>
      <div className="flex items-center gap-2 mb-3">
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
          {status.icon}
          {status.label}
        </Badge>
      </div>
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${task.progress}%` }} />
      </div>
    </Link>
  );
}

function TaskRow({ task, statusConfig, priorityConfig, isLast }: { task: Task; statusConfig: StatusConfig; priorityConfig: PriorityConfig; isLast: boolean }) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${
        !isLast ? "border-b border-zinc-800/60" : ""
      }`}
    >
      <Badge className={`${priority.color} text-[10px] px-1.5 py-0 shrink-0`}>{priority.label}</Badge>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-zinc-200 truncate">{task.title ?? "Untitled Task"}</h4>
      </div>
      <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
        {status.icon}
        {status.label}
      </Badge>
      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
    </Link>
  );
}