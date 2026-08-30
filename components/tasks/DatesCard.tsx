// components/tasks/DatesCard.tsx
"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

interface TaskDetail {
  id: string;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface DatesCardProps {
  task: TaskDetail;
  onUpdate: (updates: Partial<TaskDetail>) => Promise<boolean>;
}

export function DatesCard({ task, onUpdate }: DatesCardProps) {
  const [updating, setUpdating] = useState(false);

  const updateDate = async (field: string, value: string) => {
    setUpdating(true);
    await onUpdate({ [field]: value ? new Date(value).toISOString() : null });
    setUpdating(false);
  };

  const toInputValue = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-purple-400" /> Dates
      </h3>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Due Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.dueDate)}
          onChange={(e) => updateDate("dueDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Start Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.startDate)}
          onChange={(e) => updateDate("startDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">End Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.endDate)}
          onChange={(e) => updateDate("endDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}