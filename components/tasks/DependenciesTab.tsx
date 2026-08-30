// components/tasks/DependenciesTab.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Unlink, Loader2 } from "lucide-react";
import { DependencyGraph } from "./DependencyGraph";
import { DependencySearch } from "./DependencySearch";

interface TaskDependency {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
}

interface DependenciesTabProps {
  taskId: string;
  dependsOn: TaskDependency[];
  dependents: TaskDependency[];
  taskStatus: string;
  onUpdate: () => void;
}

export function DependenciesTab({ taskId, dependsOn, dependents, taskStatus, onUpdate }: DependenciesTabProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const addDependency = async (depId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnId: depId }),
      });
      if (!res.ok) throw new Error("Failed to add dependency");
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const removeDependency = async (depId: string) => {
    setRemoving(depId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies?dependsOnId=${depId}`, {
        method: "DELETE",
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <DependencySearch taskId={taskId} onAdd={addDependency} onUpdate={onUpdate} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-300">This task depends on</h3>
        {dependsOn.length === 0 ? (
          <p className="text-xs text-zinc-600">No upstream dependencies.</p>
        ) : (
          <div className="space-y-1">
            {dependsOn.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 rounded-lg"
              >
                <Link href={`/dashboard/tasks/${dep.id}`} className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{dep.title ?? "Untitled"}</p>
                  <p className="text-[10px] text-zinc-600">{dep.taskNo ?? dep.id.slice(0, 8)}</p>
                </Link>
                <button
                  onClick={() => removeDependency(dep.id)}
                  disabled={removing === dep.id}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                >
                  {removing === dep.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800/60">
        <DependencyGraph
          dependsOn={dependsOn}
          dependents={dependents}
          taskId={taskId}
          taskStatus={taskStatus}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}