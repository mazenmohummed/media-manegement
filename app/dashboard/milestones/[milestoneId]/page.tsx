"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Milestone,
  Folder,
  TrendingUp,
  Edit3,
  Save,
  Trash2,
  Loader2,
  Plus,
  Target,
  BarChart3,
  ChevronRight,
  Users,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StatusConfig = Record<string, { label: string; color: string; icon: React.ReactNode }>;

const statusConfig: StatusConfig = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: <Clock className="w-3 h-3" /> },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: <TrendingUp className="w-3 h-3" /> },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800", icon: <XCircle className="w-3 h-3" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  MEDIUM: { label: "Medium", color: "bg-blue-950/30 text-blue-400 border-blue-800" },
  HIGH: { label: "High", color: "bg-orange-950/30 text-orange-400 border-orange-800" },
  URGENT: { label: "Urgent", color: "bg-red-950/30 text-red-400 border-red-800" },
};

interface TaskItem {
  id: string;
  taskNo: string | null;
  title: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  assignees: { id: string; name: string; avatarUrl: string | null }[];
  category: { id: string; name: string } | null;
  _count: { comments: number; todos: number };
}

interface MilestoneDetail {
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
  tasks: TaskItem[];
  createdAt: string;
  updatedAt: string;
}

export default function MilestoneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const milestoneId = params?.milestoneId as string;

  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchMilestone = useCallback(async () => {
    if (!milestoneId) return; // ← add this guard
    setLoading(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`);
      if (res.ok) {
        const data = await res.json();
        setMilestone(data);
        setEditName(data.name);
        setEditDescription(data.description || "");
      } else if (res.status === 404) {
        router.push("/dashboard/milestones");
      }
    } catch (err) {
      console.error("Failed to load milestone:", err);
    } finally {
      setLoading(false);
    }
  }, [milestoneId, router]);

  useEffect(() => {
    fetchMilestone();
  }, [fetchMilestone, milestoneId]);

  const updateMilestone = async (updates: Partial<MilestoneDetail>) => {
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {        const data = await res.json();
        setMilestone(data);
        return true;
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
    return false;
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const ok = await updateMilestone({ name: editName, description: editDescription });
    if (ok) setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/milestones");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center py-20">
        <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Milestone not found.</p>
      </div>
    );
  }

  const status = statusConfig[milestone.status] || statusConfig.PENDING;
  const isOverdue = milestone.deadline && new Date(milestone.deadline) < new Date() && milestone.status !== "COMPLETED";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/milestones"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Milestones
        </Link>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => setEditing(true)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setEditName(milestone.name);
                setEditDescription(milestone.description || "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-red-900 text-red-400 hover:bg-red-950/30"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
            Delete
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
                {status.icon}
                {status.label}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-950/30 text-red-400 border-red-800 text-[10px] px-1.5 py-0">
                  Overdue
                </Badge>
              )}
              {milestone.project && (
                <Link
                  href={`/dashboard/projects/${milestone.project.id}`}
                  className="text-[10px] text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                >
                  <Folder className="w-3 h-3" />
                  {milestone.project.name}
                </Link>
              )}
            </div>
                        {editing ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-lg font-bold text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                />
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-zinc-100">{milestone.name}</h1>
                {milestone.description && (
                  <p className="text-sm text-zinc-400">{milestone.description}</p>
                )}
              </>
            )}
          </div>

          {/* Progress Circle */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-purple-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${milestone.progress}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-zinc-200">{milestone.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300">{milestone.completedTasks}/{milestone.totalTasks} tasks</span>
          </div>
          {milestone.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span className={isOverdue ? "text-red-400" : ""}>
                Due {new Date(milestone.deadline).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span>Updated {new Date(milestone.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Status & Deadline Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Status</h3>
          <select
            value={milestone.status}
            onChange={(e) => updateMilestone({ status: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Deadline</h3>
          <input
            type="datetime-local"
            value={milestone.deadline ? new Date(milestone.deadline).toISOString().slice(0, 16) : ""}
            onChange={(e) => updateMilestone({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Order</h3>
          <input
            type="number"
            value={milestone.order}
            onChange={(e) => updateMilestone({ order: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Tasks
          </h2>
          <Link
            href={`/dashboard/tasks/new?projectId=${milestone.project?.id}&milestoneId=${milestone.id}`}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
          >
            <Plus className="w-4 h-4" /> Add Task
          </Link>
        </div>

        {milestone.tasks.length === 0 ? (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No tasks yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Add a task to start tracking progress.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {milestone.tasks.map((task, idx) => (
              <TaskRow key={task.id} task={task} isLast={idx === milestone.tasks.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, isLast }: { task: TaskItem; isLast: boolean }) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${
        !isLast ? "border-b border-zinc-800/60" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge className={`${priority.color} text-[10px] px-1.5 py-0 shrink-0`}>
          {priority.label}
        </Badge>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
            {task.title ?? "Untitled Task"}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{task.taskNo ?? task.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
          {status.icon}
          {status.label}
        </Badge>
        {task.category && (
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
            <Tag className="w-2.5 h-2.5 mr-0.5" />
            {task.category.name}
          </Badge>
        )}
      </div>

      <div className="hidden md:flex items-center gap-3 w-32 shrink-0">
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{task.progress}%</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0 w-28">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 2).map((a) => (
            <div
              key={a.id}
              className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400"
              title={a.name}
            >
              {a.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 2 && (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-500">
              +{task.assignees.length - 2}
            </div>
          )}
        </div>
        {task.assignees.length === 0 && <span className="text-[10px] text-zinc-600">—</span>}
      </div>

      <div className="hidden md:block text-[10px] text-zinc-500 shrink-0 w-24 text-right">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
    </Link>
  );
}