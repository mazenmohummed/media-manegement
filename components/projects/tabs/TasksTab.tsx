"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignees: { id: string; name: string }[];
}

const priorityClass = (p: string) =>
  p === "HIGH" || p === "URGENT"
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : p === "MEDIUM"
    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    : "bg-zinc-800 text-zinc-300 border-zinc-700";

export function TasksTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]));
  }, [projectId]);

  if (tasks === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  const filtered = statusFilter === "ALL" ? tasks : tasks.filter((t) => t.status === statusFilter);
  const statuses = ["ALL", ...Array.from(new Set(tasks.map((t) => t.status)))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                statusFilter === s
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                  : "text-zinc-500 border-transparent hover:bg-zinc-800/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Link
          href={`/dashboard/tasks?projectId=${projectId}`}
          className="text-xs text-purple-400 hover:text-purple-300 font-medium"
        >
          Open full task board →
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks match this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {filtered.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/tasks/${task.id}`}
              className="py-3 flex items-center justify-between text-xs hover:bg-zinc-800/40 px-2 rounded-lg transition-colors block"
            >
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">{task.title}</span>
                <span className="text-zinc-500 text-[10px]">
                  {task.assignees.length > 0
                    ? task.assignees.map((a) => a.name).join(", ")
                    : "Unassigned"}
                  {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Badge className={priorityClass(task.priority)}>{task.priority}</Badge>
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{task.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}