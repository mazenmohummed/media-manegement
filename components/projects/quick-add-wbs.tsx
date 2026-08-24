"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuickAddWBSProps {
  projectId: string;
  currency: string;
}

export function QuickAddWBS({ projectId }: QuickAddWBSProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState([
    { name: "", order: 0, tasks: [{ title: "", taskType: "General", estimatedHours: 0 }] },
  ]);
  const [saving, setSaving] = useState(false);

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { name: "", order: prev.length, tasks: [{ title: "", taskType: "General", estimatedHours: 0 }] },
    ]);
  }

  function updateMilestone(index: number, name: string) {
    setMilestones((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })));
  }

  function addTask(milestoneIndex: number) {
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIndex] = {
        ...next[milestoneIndex],
        tasks: [...next[milestoneIndex].tasks, { title: "", taskType: "General", estimatedHours: 0 }],
      };
      return next;
    });
  }

  function updateTask(milestoneIndex: number, taskIndex: number, field: string, value: any) {
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIndex].tasks[taskIndex] = {
        ...next[milestoneIndex].tasks[taskIndex],
        [field]: value,
      };
      return next;
    });
  }

  function removeTask(milestoneIndex: number, taskIndex: number) {
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIndex].tasks = next[milestoneIndex].tasks.filter((_, i) => i !== taskIndex);
      return next;
    });
  }

  async function handleSave() {
    const validMilestones = milestones.filter((m) => m.name.trim());
    if (validMilestones.length === 0) return alert("Add at least one milestone");

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestones: validMilestones }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save WBS");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Build Work Breakdown Structure
        </h3>
        <span className="text-xs text-zinc-500">Manual mode</span>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, mIdx) => (
          <div key={mIdx} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 w-6">{String(mIdx + 1).padStart(2, "0")}</span>
              <Input
                value={milestone.name}
                onChange={(e) => updateMilestone(mIdx, e.target.value)}
                placeholder="Milestone name (e.g. Discovery)"
                className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-100 text-sm h-8 focus-visible:ring-emerald-500"
              />
              <button onClick={() => removeMilestone(mIdx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="pl-8 space-y-2">
              {milestone.tasks.map((task, tIdx) => (
                <div key={tIdx} className="flex items-center gap-2">
                  <Input
                    value={task.title}
                    onChange={(e) => updateTask(mIdx, tIdx, "title", e.target.value)}
                    placeholder="Task title"
                    className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-100 text-xs h-7 focus-visible:ring-blue-500"
                  />
                  <Input
                    value={task.taskType}
                    onChange={(e) => updateTask(mIdx, tIdx, "taskType", e.target.value)}
                    placeholder="Type"
                    className="w-28 bg-zinc-900 border-zinc-700 text-zinc-100 text-xs h-7 focus-visible:ring-blue-500"
                  />
                  <Input
                    type="number"
                    value={task.estimatedHours}
                    onChange={(e) => updateTask(mIdx, tIdx, "estimatedHours", parseFloat(e.target.value) || 0)}
                    placeholder="Hrs"
                    className="w-20 bg-zinc-900 border-zinc-700 text-zinc-100 text-xs h-7 focus-visible:ring-blue-500"
                  />
                  <button onClick={() => removeTask(mIdx, tIdx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addTask(mIdx)}
                className="text-xs text-zinc-500 hover:text-zinc-300 gap-1"
              >
                <Plus className="w-3 h-3" /> Add Task
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMilestone}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Milestone
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save WBS
        </Button>
      </div>
    </div>
  );
}