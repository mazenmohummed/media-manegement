// components/tasks/TaskDetailClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  FolderTree,
  GitBranch,
  FileText,
  MessageSquare,
  Link2,
  Upload,
  Film,
  Plus,
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Eye,
  Download,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ProductionTaskDetail } from '@/components/production/ProductionTaskDetail';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Task {
  id: string;
  taskNo: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  taskType: string;
  progress: number;
  estimatedHours: number;
  actualHours: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string;
  milestoneId: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }[];
  project: {
    id: string;
    projectName: string;
    client: {
      id: string;
      clientName: string;
    };
  };
  milestone: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface TaskDetailClientProps {
  taskId: string;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  ACTIVE: {
    label: 'Active',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-blue-400' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-400' },
  HIGH: { label: 'High', color: 'text-orange-400' },
  URGENT: { label: 'Urgent', color: 'text-red-400' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskDetailClient({ taskId }: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Task ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Task not found');
          router.push('/dashboard/tasks');
          return;
        }
        throw new Error('Failed to fetch task');
      }
      const data = await response.json();
      setTask(data);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete Task ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete task');
      }

      toast.success('Task deleted successfully');
      router.push(`/dashboard/projects/${task?.projectId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading task...
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-zinc-100">Task not found</h2>
        <p className="mt-2 text-zinc-500">The task you're looking for doesn't exist.</p>
      </div>
    );
  }

  const statusInfo = statusConfig[task.status] || statusConfig.PENDING;
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/projects"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Projects
        </Link>
        <span className="text-zinc-600">/</span>
        <Link
          href={`/dashboard/projects/${task.projectId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {task.project.projectName}
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300 font-medium truncate max-w-[200px]">
          {task.title || task.taskNo}
        </span>
      </nav>

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-100 truncate">
                {task.title || task.taskNo}
              </h1>
              <Badge className={statusInfo.bg}>
                <span className={`flex items-center gap-1 ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </Badge>
              <Badge className={`${priorityInfo.color} bg-zinc-800/50 border-zinc-700`}>
                {priorityInfo.label}
              </Badge>
              {task.taskType && (
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">
                  {task.taskType}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {task.assignees.length > 0
                  ? task.assignees.map(a => a.name).join(', ')
                  : 'Unassigned'}
              </span>
              {task.milestone && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {task.milestone.name}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Due: {format(new Date(task.dueDate), 'PPP')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {task.taskNo}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href={`/dashboard/tasks/${taskId}/edit`}>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Edit className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
            </Link>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
              variant="outline"
              className="border-red-800/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-300 font-medium">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2 bg-zinc-700/50" />
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="production"
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            <Film className="w-4 h-4 mr-1.5" />
            Production
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Comments
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Description */}
          {task.description && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-zinc-200 mb-2">Description</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Status</p>
              <p className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Priority</p>
              <p className={`font-medium ${priorityInfo.color}`}>{priorityInfo.label}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Type</p>
              <p className="font-medium text-zinc-200">{task.taskType || 'Standard'}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Estimated Hours</p>
              <p className="font-medium text-zinc-200">{task.estimatedHours}h</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Actual Hours</p>
              <p className="font-medium text-zinc-200">{task.actualHours}h</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400">Category</p>
              <p className="font-medium text-zinc-200">{task.category?.name || 'Uncategorized'}</p>
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-zinc-200 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ borderColor: tag.color + '40', color: tag.color }}
                    className="bg-transparent border"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-200 mb-2">Assignees</h3>
            {task.assignees.length === 0 ? (
              <p className="text-sm text-zinc-500">No assignees</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-1.5"
                  >
                    {assignee.avatarUrl ? (
                      <img
                        src={assignee.avatarUrl}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">
                        {assignee.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-zinc-200">{assignee.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Production Tab ───────────────────────────────────────────────── */}
        <TabsContent value="production">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <ProductionTaskDetail
              taskId={taskId}
              projectId={task.projectId}
              task={task}
              onAssetAttached={fetchTask}
            />
          </div>
        </TabsContent>

        {/* ─── Comments Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="comments">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Comments</h3>
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] ml-1">
                0
              </Badge>
            </div>
            <div className="text-center py-8 text-zinc-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs text-zinc-600">Add a comment to start the conversation</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}