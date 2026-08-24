"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutList,
  Columns,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  PlayCircle,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, TaskPriority } from "@prisma/client";

type Assignee = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type TaskItem = {
  id: string;
  taskNo: string | null;
  title: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate: Date | null;
  estimatedHours: number;
  actualHours: number;
  assignees: Assignee[];
  category: { name: string } | null;
};

type MilestoneGroup = {
  id: string;
  name: string;
  order: number;
  deadline: Date | null;
  status: string;
  budget: number;
  tasks: TaskItem[];
};

interface TaskWorkspaceProps {
  milestones: MilestoneGroup[];
  unassignedTasks: TaskItem[];
  projectId: string;
  projectCurrency: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    icon: <Circle className="w-3 h-3" />,
  },
  ACTIVE: {
    label: "Active",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <PlayCircle className="w-3 h-3" />,
  },
  IN_REVIEW: {
    label: "In Review",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> =
  {
    LOW: {
      label: "Low",
      color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    },
    MEDIUM: {
      label: "Medium",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    HIGH: {
      label: "High",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    URGENT: {
      label: "Urgent",
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };

export function TaskWorkspace({
  milestones,
  unassignedTasks,
  projectId,
}: TaskWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set([...milestones.map((m) => m.id), "backlog"])
  );

  const allGroups = useMemo(() => {
    const groups: MilestoneGroup[] = [...milestones];
    if (unassignedTasks.length > 0) {
      groups.unshift({
        id: "backlog",
        name: "Backlog",
        order: -1,
        deadline: null,
        status: "PENDING",
        budget: 0,
        tasks: unassignedTasks,
      });
    }
    return groups;
  }, [milestones, unassignedTasks]);

  const filteredGroups = useMemo(() => {
    return allGroups
      .map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) => {
          const matchesStatus =
            statusFilter.length === 0 || statusFilter.includes(task.status);
          const matchesPriority =
            priorityFilter.length === 0 ||
            priorityFilter.includes(task.priority);
          const matchesSearch =
            !searchQuery ||
            task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.taskNo?.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesStatus && matchesPriority && matchesSearch;
        }),
      }))
      .filter((group) => group.tasks.length > 0);
  }, [allGroups, statusFilter, priorityFilter, searchQuery]);

  const toggleStatus = (status: TaskStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const togglePriority = (priority: TaskPriority) => {
    setPriorityFilter((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFiltersCount = statusFilter.length + priorityFilter.length;

  const totalVisible = filteredGroups.reduce(
    (sum, g) => sum + g.tasks.length,
    0
  );

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* View Toggle */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "board"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Board
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "list"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> List
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-56"
          />
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-medium">Status</span>
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                statusFilter.includes(status)
                  ? STATUS_CONFIG[status].color
                  : "bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Priority Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-medium">
            Priority
          </span>
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((priority) => (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                priorityFilter.includes(priority)
                  ? PRIORITY_CONFIG[priority].color
                  : "bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {PRIORITY_CONFIG[priority].label}
            </button>
          ))}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={() => {
              setStatusFilter([]);
              setPriorityFilter([]);
              setSearchQuery("");
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 underline"
          >
            Clear {activeFiltersCount}
          </button>
        )}

        <div className="ml-auto text-xs text-zinc-500">
          {totalVisible} tasks
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {viewMode === "board" ? (
          <BoardView
            groups={filteredGroups}
            projectId={projectId}
            expandedMilestones={expandedMilestones}
            toggleExpand={toggleExpand}
          />
        ) : (
          <ListView
            groups={filteredGroups}
            projectId={projectId}
            expandedMilestones={expandedMilestones}
            toggleExpand={toggleExpand}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Board View
// ------------------------------------------------------------------

function BoardView({
  groups,
  projectId,
  expandedMilestones,
  toggleExpand,
}: {
  groups: MilestoneGroup[];
  projectId: string;
  expandedMilestones: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No tasks match your filters.
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {groups.map((group) => {
        const isExpanded = expandedMilestones.has(group.id);
        return (
          <div
            key={group.id}
            className="flex-shrink-0 w-80 flex flex-col h-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl"
          >
            {/* Column Header */}
            <div
              className="p-3 border-b border-zinc-800/80 cursor-pointer select-none"
              onClick={() => toggleExpand(group.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <h3 className="text-sm font-semibold text-zinc-200 truncate">
                    {group.name}
                  </h3>
                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-full shrink-0">
                    {group.tasks.length}
                  </span>
                </div>
              </div>
              {group.deadline && (
                <p className="text-[10px] text-zinc-500 mt-1 ml-5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(group.deadline).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Tasks */}
            {isExpanded && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {group.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} projectId={projectId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// List View
// ------------------------------------------------------------------

function ListView({
  groups,
  projectId,
  expandedMilestones,
  toggleExpand,
}: {
  groups: MilestoneGroup[];
  projectId: string;
  expandedMilestones: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No tasks match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {groups.map((group) => {
        const isExpanded = expandedMilestones.has(group.id);
        return (
          <div
            key={group.id}
            className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl overflow-hidden"
          >
            <div
              className="flex items-center gap-2 p-3 border-b border-zinc-800/80 cursor-pointer select-none hover:bg-zinc-900/50 transition-colors"
              onClick={() => toggleExpand(group.id)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              )}
              <h3 className="text-sm font-semibold text-zinc-200">
                {group.name}
              </h3>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-full">
                {group.tasks.length}
              </span>
              {group.deadline && (
                <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(group.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="divide-y divide-zinc-800/60">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} projectId={projectId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Task Card (Board)
// ------------------------------------------------------------------

function TaskCard({
  task,
  projectId,
}: {
  task: TaskItem;
  projectId: string;
}) {
  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-zinc-500">
          {task.taskNo || task.id.slice(0, 8)}
        </span>
        <Badge
          className={`${PRIORITY_CONFIG[task.priority].color} text-[10px] px-1.5 py-0`}
        >
          {task.priority}
        </Badge>
      </div>

      <h4 className="text-xs font-medium text-zinc-200 mb-3 line-clamp-2 group-hover:text-blue-300 transition-colors">
        {task.title || "Untitled Task"}
      </h4>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
          <span>{task.progress}%</span>
          {task.estimatedHours > 0 && (
            <span>
              {task.actualHours}h / {task.estimatedHours}h
            </span>
          )}
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Badge
          className={`${STATUS_CONFIG[task.status].color} text-[10px] px-1.5 py-0 flex items-center gap-1`}
        >
          {STATUS_CONFIG[task.status].icon}
          {STATUS_CONFIG[task.status].label}
        </Badge>

        <div className="flex items-center -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400"
              title={a.name}
            >
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt={a.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                a.name.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-500">
              +{task.assignees.length - 3}
            </div>
          )}
          {task.assignees.length === 0 && (
            <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
              <User className="w-3 h-3" /> Unassigned
            </span>
          )}
        </div>
      </div>

      {task.dueDate && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
          <Calendar className="w-3 h-3" />
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </Link>
  );
}

// ------------------------------------------------------------------
// Task Row (List)
// ------------------------------------------------------------------

function TaskRow({
  task,
  projectId,
}: {
  task: TaskItem;
  projectId: string;
}) {
  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/40 transition-colors group text-xs"
    >
      <div className="w-24 shrink-0">
        <span className="font-mono text-zinc-500 text-[10px]">
          {task.taskNo || task.id.slice(0, 8)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-zinc-200 block truncate group-hover:text-blue-300 transition-colors">
          {task.title || "Untitled Task"}
        </span>
        {task.category && (
          <span className="text-[10px] text-zinc-500">
            {task.category.name}
          </span>
        )}
      </div>

      <div className="w-28 shrink-0">
        <Badge
          className={`${STATUS_CONFIG[task.status].color} text-[10px] px-1.5 py-0 flex items-center gap-1 w-fit`}
        >
          {STATUS_CONFIG[task.status].icon}
          {STATUS_CONFIG[task.status].label}
        </Badge>
      </div>

      <div className="w-20 shrink-0">
        <Badge
          className={`${PRIORITY_CONFIG[task.priority].color} text-[10px] px-1.5 py-0 w-fit`}
        >
          {task.priority}
        </Badge>
      </div>

      <div className="w-32 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-zinc-500 text-[10px]">{task.progress}%</span>
        </div>
      </div>

      <div className="w-28 shrink-0 text-zinc-500 text-[10px]">
        {task.estimatedHours > 0
          ? `${task.actualHours}h / ${task.estimatedHours}h`
          : "—"}
      </div>

      <div className="w-32 shrink-0">
        <div className="flex items-center -space-x-1.5 justify-end">
          {task.assignees.slice(0, 2).map((a) => (
            <div
              key={a.id}
              className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400"
              title={a.name}
            >
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt={a.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                a.name.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {task.assignees.length > 2 && (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-500">
              +{task.assignees.length - 2}
            </div>
          )}
          {task.assignees.length === 0 && (
            <span className="text-zinc-600 flex items-center gap-0.5">
              <User className="w-3 h-3" /> Unassigned
            </span>
          )}
        </div>
      </div>

      <div className="w-24 shrink-0 text-right text-zinc-500 text-[10px]">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
      </div>
    </Link>
  );
}