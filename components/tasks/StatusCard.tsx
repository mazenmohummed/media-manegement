// components/tasks/StatusCard.tsx
"use client";

import { useState } from "react";

interface TaskDetail {
  id: string;
  status: string;
  priority: string;
}

interface StatusCardProps {
  task: TaskDetail;
  onUpdate: (updates: Partial<TaskDetail>) => Promise<boolean>;
}

export function StatusCard({ task, onUpdate }: StatusCardProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    await onUpdate({ status });
    setUpdating(false);
  };

  const handlePriorityChange = async (priority: string) => {
    setUpdating(true);
    await onUpdate({ priority });
    setUpdating(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300">Status & Priority</h3>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</label>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Priority</label>
        <select
          value={task.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
    </div>
  );
}