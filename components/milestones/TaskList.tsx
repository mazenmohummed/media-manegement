// components/milestones/TaskList.tsx
'use client';

import Link from 'next/link';
import { ChevronRight, Tag, Plus, Clock, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface TaskListProps {
  tasks: TaskItem[];
  milestoneId: string;
  projectId?: string;
  onUpdate?: () => void;
}

export function TaskList({ tasks, milestoneId, projectId, onUpdate }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
        <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 font-medium">No tasks yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Add a task to start tracking progress.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {tasks.map((task, idx) => (
        <TaskRow key={task.id} task={task} isLast={idx === tasks.length - 1} />
      ))}
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