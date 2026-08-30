// components/tasks/DependencyGraph.tsx
"use client";

import Link from "next/link";
import { GitBranch, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

interface TaskDependency {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
}

interface DependencyGraphProps {
  dependsOn: TaskDependency[];
  dependents: TaskDependency[];
  taskId: string;
  taskStatus: string;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  PENDING: "border-zinc-700 bg-zinc-900/50",
  ACTIVE: "border-blue-700 bg-blue-950/30",
  IN_REVIEW: "border-amber-700 bg-amber-950/30",
  COMPLETED: "border-emerald-700 bg-emerald-950/30",
  CANCELLED: "border-red-700 bg-red-950/30",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5 text-zinc-500" />,
  ACTIVE: <Clock className="w-3.5 h-3.5 text-blue-400" />,
  IN_REVIEW: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

export function DependencyGraph({ dependsOn, dependents, taskId, taskStatus, onUpdate }: DependencyGraphProps) {
  const hasBlockingDependencies = dependsOn.some(dep => dep.status !== "COMPLETED" && dep.status !== "CANCELLED");
  const canComplete = !hasBlockingDependencies;

  return (
    <div className="space-y-6">
      {/* Completion Block Warning */}
      {taskStatus !== "COMPLETED" && taskStatus !== "CANCELLED" && (
        <div className={`rounded-lg p-4 border ${hasBlockingDependencies ? 'bg-amber-950/20 border-amber-700/50' : 'bg-emerald-950/20 border-emerald-700/50'}`}>
          <div className="flex items-start gap-3">
            {hasBlockingDependencies ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {hasBlockingDependencies 
                  ? "Cannot complete this task yet" 
                  : "Ready to complete"}
              </p>
              <p className="text-xs text-zinc-400">
                {hasBlockingDependencies 
                  ? `${dependsOn.filter(d => d.status !== "COMPLETED" && d.status !== "CANCELLED").length} blocking dependencies need to be completed first`
                  : "All dependencies are resolved. You can mark this task as completed."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Graph Visualization */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" />
          Dependency Graph
        </h4>

        {/* Depends On (Upstream) */}
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Blocks this task</p>
          <div className="flex flex-wrap gap-2">
            {dependsOn.length === 0 ? (
              <span className="text-xs text-zinc-600 italic">No dependencies</span>
            ) : (
              dependsOn.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/dashboard/tasks/${dep.id}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:opacity-80 ${statusColors[dep.status] || statusColors.PENDING}`}
                >
                  {statusIcons[dep.status] || <Clock className="w-3.5 h-3.5 text-zinc-500" />}
                  <span className="text-zinc-300">{dep.title || "Untitled"}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">{dep.taskNo || dep.id.slice(0, 8)}</span>
                  {dep.status !== "COMPLETED" && dep.status !== "CANCELLED" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* This task (center) */}
        <div className="flex items-center justify-center py-2">
          <div className="px-4 py-2 rounded-lg border-2 border-purple-500/50 bg-purple-950/20">
            <span className="text-xs font-medium text-purple-300">
              {taskId.slice(0, 8)} (This Task)
            </span>
          </div>
        </div>

        {/* Dependents (Downstream) */}
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Depends on this task</p>
          <div className="flex flex-wrap gap-2">
            {dependents.length === 0 ? (
              <span className="text-xs text-zinc-600 italic">No dependents</span>
            ) : (
              dependents.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/dashboard/tasks/${dep.id}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:opacity-80 ${statusColors[dep.status] || statusColors.PENDING}`}
                >
                  {statusIcons[dep.status] || <Clock className="w-3.5 h-3.5 text-zinc-500" />}
                  <span className="text-zinc-300">{dep.title || "Untitled"}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">{dep.taskNo || dep.id.slice(0, 8)}</span>
                  {dep.status !== "COMPLETED" && dep.status !== "CANCELLED" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}