// components/tasks/OverviewTab.tsx
"use client";

import { useState } from "react";
import { Edit3, Check, X, Loader2, Milestone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TaskDetail {
  id: string;
  description: string | null;
  milestone: {
    id: string;
    name: string;
    progress: number;
    status: string;
    deadline: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  ACTIVE: { label: "Active", color: "bg-blue-950/40 text-blue-400 border-blue-800" },
  IN_REVIEW: { label: "In Review", color: "bg-amber-950/40 text-amber-400 border-amber-800" },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800" },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800" },
};

interface OverviewTabProps {
  task: TaskDetail;
  onUpdate: () => void;
}

export function OverviewTab({ task, onUpdate }: OverviewTabProps) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description || "");
  const [savingDesc, setSavingDesc] = useState(false);

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descValue }),
      });
      if (res.ok) {
        setEditingDesc(false);
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update description:", err);
    } finally {
      setSavingDesc(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-300">Description</h3>
          {!editingDesc ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-zinc-500 hover:text-zinc-300"
              onClick={() => setEditingDesc(true)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-emerald-400 hover:text-emerald-300"
                onClick={handleSaveDesc}
                disabled={savingDesc}
              >
                {savingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => {
                  setDescValue(task.description || "");
                  setEditingDesc(false);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        {editingDesc ? (
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
            placeholder="Add a description..."
          />
        ) : task.description ? (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{task.description}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">No description provided.</p>
        )}
      </div>

      {task.milestone && (
        <div className="pt-4 border-t border-zinc-800/60">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Milestone Progress</h3>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Milestone className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-200">{task.milestone.name}</span>
              </div>
              <Badge className={`${statusConfig[task.milestone.status]?.color ?? statusConfig.PENDING.color} text-[10px]`}>
                {statusConfig[task.milestone.status]?.label ?? "Pending"}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Overall Completion</span>
                <span className="font-mono">{task.milestone.progress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${task.milestone.progress}%` }}
                />
              </div>
            </div>
            {task.milestone.deadline && (
              <p className="text-xs text-zinc-500">
                Deadline: {new Date(task.milestone.deadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}