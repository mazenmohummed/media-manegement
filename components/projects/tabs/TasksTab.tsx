// components/projects/tabs/TasksTab.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Loader2, 
  Briefcase, 
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  FileText,
  GitBranch,
  ClipboardList,
  ListTodo,
  GitPullRequest,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  taskType: string;
  dueDate: string | null;
  assignees: { id: string; name: string }[];
  createdAt?: string;
  description?: string | null;
}

const priorityClass = (p: string) =>
  p === "HIGH" || p === "URGENT"
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : p === "MEDIUM"
    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    : "bg-zinc-800 text-zinc-300 border-zinc-700";

const statusConfig = {
  PENDING: { label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ACTIVE: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  COMPLETED: { label: 'Completed', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const taskTypeIcons: Record<string, React.ReactNode> = {
  STANDARD: <FileText className="w-3.5 h-3.5" />,
  REVISION: <GitBranch className="w-3.5 h-3.5" />,
  REQUEST: <GitPullRequest className="w-3.5 h-3.5" />,
  DEFAULT: <ClipboardList className="w-3.5 h-3.5" />,
};

const taskTypeLabels: Record<string, string> = {
  STANDARD: 'Task',
  REVISION: 'Revision',
  REQUEST: 'Request',
  DEFAULT: 'Task',
};

export function TasksTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL"); // ✅ New filter for task type
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks ?? []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Type filter (Tasks vs Requests)
    if (typeFilter !== "ALL") {
      if (typeFilter === "TASK") {
        filtered = filtered.filter(task => task.taskType === "STANDARD" || task.taskType === "REVISION" || !task.taskType);
      } else if (typeFilter === "REQUEST") {
        filtered = filtered.filter(task => task.taskType === "REQUEST");
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.assignees.some(a => a.name.toLowerCase().includes(query)) ||
        task.taskType?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Sort by createdAt (newest first)
    filtered.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    setFilteredTasks(filtered);
    setCurrentPage(1);
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete task');
      }

      toast.success('Deleted successfully');
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Failed to delete');
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Get unique values for filters
  const statuses = ["ALL", ...Array.from(new Set(tasks.map(t => t.status)))];
  const priorities = ["ALL", ...Array.from(new Set(tasks.map(t => t.priority)))];
  const types = ["ALL", "TASK", "REQUEST"];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const activeTasks = tasks.filter(t => t.status === "ACTIVE" || t.status === "IN_REVIEW").length;
  const pendingTasks = tasks.filter(t => t.status === "PENDING").length;
  const requestCount = tasks.filter(t => t.taskType === "REQUEST").length;
  const taskCount = tasks.filter(t => t.taskType !== "REQUEST" || !t.taskType).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-zinc-100">{totalTasks}</p>
          <p className="text-xs text-zinc-400">Total</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{pendingTasks}</p>
          <p className="text-xs text-zinc-400">Pending</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{activeTasks}</p>
          <p className="text-xs text-zinc-400">Active</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-zinc-400">{completedTasks}</p>
          <p className="text-xs text-zinc-400">Completed</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-purple-400">{taskCount}</p>
          <p className="text-xs text-zinc-400">Tasks</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{requestCount}</p>
          <p className="text-xs text-zinc-400">Requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500"
          />
        </div>

        {/* ✅ Type Filter - Tasks vs Requests */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === "ALL" ? "All Types" : t === "TASK" ? "📋 Tasks" : "📩 Requests"}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All Status" : s}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? "All Priority" : p}
            </option>
          ))}
        </select>

        {(searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL" || typeFilter !== "ALL") && (
          <Button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setPriorityFilter("ALL");
              setTypeFilter("ALL");
            }}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-200"
          >
            Clear Filters
          </Button>
        )}

        <Link href={`/dashboard/tasks/new?projectId=${projectId}`}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            New Task
          </Button>
        </Link>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL" || typeFilter !== "ALL"
              ? "No items match your filters."
              : "No tasks yet. Create your first task!"}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-zinc-800 border border-zinc-700/50 rounded-xl overflow-hidden">
            {currentTasks.map((task) => {
              const statusInfo = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const typeIcon = taskTypeIcons[task.taskType as keyof typeof taskTypeIcons] || taskTypeIcons.DEFAULT;
              const typeLabel = taskTypeLabels[task.taskType as keyof typeof taskTypeLabels] || taskTypeLabels.DEFAULT;
              const isRequest = task.taskType === "REQUEST";

              return (
                <div
                  key={task.id}
                  className="py-3 px-4 flex items-center justify-between text-xs hover:bg-zinc-800/40 transition-colors group"
                >
                  <Link
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex-1 min-w-0 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`${isRequest ? 'text-amber-400' : 'text-purple-400'}`}>
                          {typeIcon}
                        </span>
                        <span className="font-semibold text-zinc-200 block truncate">
                          {task.title}
                        </span>
                        <Badge className={`${isRequest ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'} text-[9px]`}>
                          {typeLabel}
                        </Badge>
                      </div>
                      <span className="text-zinc-500 text-[10px]">
                        {task.assignees.length > 0
                          ? task.assignees.map((a) => a.name).join(", ")
                          : "Unassigned"}
                        {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={priorityClass(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </Link>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteTask(task.id, task.title)}
                    className="ml-3 p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-700/50">
              <div className="text-sm text-zinc-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} items
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm text-zinc-300">{currentPage}</span>
                  <span className="text-sm text-zinc-500">/</span>
                  <span className="text-sm text-zinc-500">{totalPages}</span>
                </div>
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}