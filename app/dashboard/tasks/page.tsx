// components/tasks/TasksPage.tsx
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
  Play,
  Loader2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagManager } from "@/components/tags/TagManager";

interface Project {
  id: string;
  name: string;
  projectName: string;
  tags?: { id: string; name: string; color: string }[];
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
  tags?: { id: string; name: string; color: string }[];
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

// ─── QuickTaskStarter Component ──────────────────────────────────────────────

interface QuickTaskStarterProps {
  taskId: string;
  taskTitle: string | null;
  onStart?: () => void;
}

function QuickTaskStarter({ taskId, taskTitle, onStart }: QuickTaskStarterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const startQuickSession = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tasks/${taskId}/work-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      setSuccess(true);
      if (onStart) onStart();

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 transition-all duration-300';
      toast.textContent = `Started work on "${taskTitle || 'Task'}"`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 transition-all duration-300';
      toast.textContent = err.message || 'Failed to start session';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={startQuickSession}
      disabled={loading}
      className={`p-1.5 rounded-lg transition-colors ${
        success
          ? 'bg-emerald-500/20 text-emerald-400'
          : error
          ? 'bg-rose-500/20 text-rose-400'
          : 'bg-zinc-800/50 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-400'
      }`}
      title="Start work session"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : success ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Play className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("projectId") || "ALL";
  const urlTagId = searchParams.get("tagId") || null;

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
  const [tagFilter, setTagFilter] = useState<string | null>(urlTagId);
  const [tagAssignmentTaskId, setTagAssignmentTaskId] = useState<string | null>(null);
  const [isAssigningTags, setIsAssigningTags] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter && projectFilter !== "ALL") params.set("projectId", projectFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (milestoneFilter !== "ALL") params.set("milestoneId", milestoneFilter);
      if (tagFilter) params.set("tagId", tagFilter);
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
  }, [projectFilter, statusFilter, priorityFilter, milestoneFilter, tagFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSessionStart = () => {
    fetchTasks();
  };

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/tasks${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    router.push("/dashboard/tasks");
    setTagFilter(null);
  };

  const handleTagSelect = (tagId: string) => {
    setTagFilter(tagId);
    updateFilters("tagId", tagId);
  };

  const handleTagDeselect = () => {
    setTagFilter(null);
    updateFilters("tagId", null);
  };

  const assignTagsToTask = async (taskId: string, tagIds: string[]) => {
    setIsAssigningTags(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the task in the local state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, tags: data.tags || [] }
              : t
          )
        );
        // Also update in project groups
        setProjectGroups((prev) =>
          prev.map((pg) => ({
            ...pg,
            milestones: pg.milestones.map((m) => ({
              ...m,
              tasks: m.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, tags: data.tags || [] }
                  : t
              ),
            })),
            ungroupedTasks: pg.ungroupedTasks.map((t) =>
              t.id === taskId
                ? { ...t, tags: data.tags || [] }
                : t
            ),
          }))
        );
        setTagAssignmentTaskId(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to assign tags");
      }
    } catch (err) {
      console.error("Failed to assign tags:", err);
      alert("Failed to assign tags");
    } finally {
      setIsAssigningTags(false);
    }
  };

  const handleTagAssignment = (taskId: string, tagIds: string[]) => {
    assignTagsToTask(taskId, tagIds);
  };

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (t.title?.toLowerCase().includes(q) ?? false) ||
      (t.taskNo?.toLowerCase().includes(q) ?? false) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const allMilestoneOptions = projectGroups.flatMap((pg) => pg.milestones.map((m) => m.milestone));

  // Check if any filters are active
  const hasFilters = statusFilter !== "ALL" || priorityFilter !== "ALL" || milestoneFilter !== "ALL" || projectFilter !== "ALL" || tagFilter || searchQuery;

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                updateFilters("q", e.target.value || null);
              }}
              placeholder="Search tasks by title, number, or description..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                updateFilters("projectId", e.target.value === "ALL" ? null : e.target.value);
              }}
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                updateFilters("status", e.target.value === "ALL" ? null : e.target.value);
              }}
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
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                updateFilters("priority", e.target.value === "ALL" ? null : e.target.value);
              }}
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
              onChange={(e) => {
                setMilestoneFilter(e.target.value);
                updateFilters("milestoneId", e.target.value === "ALL" ? null : e.target.value);
              }}
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

        {/* Tag Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
          <Tag className="w-4 h-4 text-purple-400" />
          <TagManager
            selectedTagIds={tagFilter ? [tagFilter] : []}
            onSelectTag={handleTagSelect}
            onDeselectTag={handleTagDeselect}
            multiSelect={false}
          />
        </div>

        {/* Clear Filters Button */}
        {hasFilters && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-500 hover:text-zinc-300"
              onClick={clearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        )}
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
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-purple-400 hover:text-purple-300"
              onClick={clearFilters}
            >
              Clear filters to see all tasks
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {projectGroups.map((pg) => {
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

            // Check if project has tags
            const hasProjectTags = pg.project.tags && pg.project.tags.length > 0;

            return (
              <div key={pg.project.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                {/* Project Header with Tags */}
                <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="p-2 bg-purple-950/40 border border-purple-800/60 rounded-lg">
                    <FolderKanban className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">
                    {pg.project.name || pg.project.projectName}
                  </h2>
                  
                  {/* Display Project Tags */}
                  {hasProjectTags && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      {pg.project.tags!.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
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
                        (Project Tags)
                      </span>
                    </div>
                  )}
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
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              statusConfig={statusConfig} 
                              priorityConfig={priorityConfig}
                              onSessionStart={handleSessionStart}
                              onTagAssign={() => setTagAssignmentTaskId(
                                tagAssignmentTaskId === task.id ? null : task.id
                              )}
                              isTagAssignmentOpen={tagAssignmentTaskId === task.id}
                              onTagAssignment={handleTagAssignment}
                              isAssigningTags={isAssigningTags}
                              isProjectTagged={hasProjectTags}
                            />
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
                              onSessionStart={handleSessionStart}
                              isLast={idx === mg.tasks.length - 1}
                              onTagAssign={() => setTagAssignmentTaskId(
                                tagAssignmentTaskId === task.id ? null : task.id
                              )}
                              isTagAssignmentOpen={tagAssignmentTaskId === task.id}
                              onTagAssignment={handleTagAssignment}
                              isAssigningTags={isAssigningTags}
                              isProjectTagged={hasProjectTags}
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
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              statusConfig={statusConfig} 
                              priorityConfig={priorityConfig}
                              onSessionStart={handleSessionStart}
                              onTagAssign={() => setTagAssignmentTaskId(
                                tagAssignmentTaskId === task.id ? null : task.id
                              )}
                              isTagAssignmentOpen={tagAssignmentTaskId === task.id}
                              onTagAssignment={handleTagAssignment}
                              isAssigningTags={isAssigningTags}
                              isProjectTagged={hasProjectTags}
                            />
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
                              onSessionStart={handleSessionStart}
                              isLast={idx === filteredUngrouped.length - 1}
                              onTagAssign={() => setTagAssignmentTaskId(
                                tagAssignmentTaskId === task.id ? null : task.id
                              )}
                              isTagAssignmentOpen={tagAssignmentTaskId === task.id}
                              onTagAssignment={handleTagAssignment}
                              isAssigningTags={isAssigningTags}
                              isProjectTagged={hasProjectTags}
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

// ─── TaskCard with QuickTaskStarter, Tags, and Tag Assignment ──────────────

function TaskCard({ 
  task, 
  statusConfig, 
  priorityConfig,
  onSessionStart,
  onTagAssign,
  isTagAssignmentOpen,
  onTagAssignment,
  isAssigningTags,
  isProjectTagged,
}: { 
  task: Task; 
  statusConfig: StatusConfig; 
  priorityConfig: PriorityConfig;
  onSessionStart?: () => void;
  onTagAssign?: () => void;
  isTagAssignmentOpen?: boolean;
  onTagAssignment?: (taskId: string, tagIds: string[]) => void;
  isAssigningTags?: boolean;
  isProjectTagged?: boolean;
}) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const taskTagIds = task.tags?.map((t) => t.id) || [];

  // If project has tags, tasks inherit them and cannot be individually tagged
  const canAssignTags = !isProjectTagged;

  return (
    <div className="relative group">
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
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
            {status.icon}
            {status.label}
          </Badge>
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-400"
                  title={a.name}
                >
                  {a.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Display Tags - show project inherited message if project has tags */}
        {isProjectTagged ? (
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-zinc-500">
            <Tag className="w-3 h-3 text-purple-400" />
            <span>Inherits project tags</span>
          </div>
        ) : (
          task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${tag.color}25`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )
        )}

        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
      </Link>

      {/* Tag Assignment Button - Only show if project doesn't have tags */}
      {canAssignTags && (
        <div className="absolute bottom-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onTagAssign) onTagAssign();
            }}
          >
            <Tag className="w-3 h-3" />
            <span className="ml-0.5 text-[8px]">
              {task.tags?.length || 0}
            </span>
          </Button>
        </div>
      )}

      {/* Tag Assignment Dropdown */}
      {isTagAssignmentOpen && onTagAssignment && canAssignTags && (
        <div 
          className="absolute bottom-8 right-0 z-20 w-64 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">
              Assign Tags
            </span>
            <button
              onClick={() => {
                if (onTagAssign) onTagAssign();
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <TagManager
            selectedTagIds={taskTagIds}
            onSelectTag={(tagId) => {
              const newTagIds = [...taskTagIds, tagId];
              onTagAssignment(task.id, newTagIds);
            }}
            onDeselectTag={(tagId) => {
              const newTagIds = taskTagIds.filter((id) => id !== tagId);
              onTagAssignment(task.id, newTagIds);
            }}
            multiSelect={true}
            onTagsChange={() => {}}
          />

          {isAssigningTags && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="ml-2 text-xs text-zinc-500">Assigning...</span>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-zinc-500 hover:text-zinc-300"
              onClick={() => {
                if (onTagAssign) onTagAssign();
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TaskRow with QuickTaskStarter, Tags, and Tag Assignment ────────────────

function TaskRow({ 
  task, 
  statusConfig, 
  priorityConfig, 
  onSessionStart,
  isLast,
  onTagAssign,
  isTagAssignmentOpen,
  onTagAssignment,
  isAssigningTags,
  isProjectTagged,
}: { 
  task: Task; 
  statusConfig: StatusConfig; 
  priorityConfig: PriorityConfig;
  onSessionStart?: () => void;
  isLast: boolean;
  onTagAssign?: () => void;
  isTagAssignmentOpen?: boolean;
  onTagAssignment?: (taskId: string, tagIds: string[]) => void;
  isAssigningTags?: boolean;
  isProjectTagged?: boolean;
}) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const taskTagIds = task.tags?.map((t) => t.id) || [];
  const canAssignTags = !isProjectTagged;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${!isLast ? "border-b border-zinc-800/60" : ""}`}>
      <Link
        href={`/dashboard/tasks/${task.id}`}
        className="flex-1 flex items-center gap-4 min-w-0"
      >
        <Badge className={`${priority.color} text-[10px] px-1.5 py-0 shrink-0`}>{priority.label}</Badge>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 truncate">{task.title ?? "Untitled Task"}</h4>
          {/* Display Tags in row view */}
          {isProjectTagged ? (
            <div className="flex items-center gap-1.5 mt-1 text-[9px] text-zinc-500">
              <Tag className="w-3 h-3 text-purple-400" />
              <span>Inherits project tags</span>
            </div>
          ) : (
            task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {task.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${tag.color}25`,
                      color: tag.color,
                      border: `1px solid ${tag.color}40`,
                    }}
                  >
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </span>
                ))}
                {task.tags.length > 3 && (
                  <span className="text-[7px] text-zinc-500 font-medium">
                    +{task.tags.length - 3}
                  </span>
                )}
              </div>
            )
          )}
        </div>
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1 shrink-0`}>
          {status.icon}
          {status.label}
        </Badge>
        <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
      </Link>
      
      {/* Tag Assignment Button - Only show if project doesn't have tags */}
      {canAssignTags && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onTagAssign) onTagAssign();
          }}
        >
          <Tag className="w-3 h-3" />
          <span className="ml-0.5 text-[8px]">
            {task.tags?.length || 0}
          </span>
        </Button>
      )}

      {/* QuickTaskStarter */}
      <QuickTaskStarter 
        taskId={task.id} 
        taskTitle={task.title}
        onStart={onSessionStart}
      />

      {/* Tag Assignment Dropdown for Row View */}
      {isTagAssignmentOpen && onTagAssignment && canAssignTags && (
        <div 
          className="absolute right-0 top-full mt-1 z-20 w-64 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">
              Assign Tags
            </span>
            <button
              onClick={() => {
                if (onTagAssign) onTagAssign();
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <TagManager
            selectedTagIds={taskTagIds}
            onSelectTag={(tagId) => {
              const newTagIds = [...taskTagIds, tagId];
              onTagAssignment(task.id, newTagIds);
            }}
            onDeselectTag={(tagId) => {
              const newTagIds = taskTagIds.filter((id) => id !== tagId);
              onTagAssignment(task.id, newTagIds);
            }}
            multiSelect={true}
            onTagsChange={() => {}}
          />

          {isAssigningTags && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="ml-2 text-xs text-zinc-500">Assigning...</span>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-zinc-500 hover:text-zinc-300"
              onClick={() => {
                if (onTagAssign) onTagAssign();
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}