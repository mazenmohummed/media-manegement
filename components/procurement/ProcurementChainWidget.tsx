// components/dashboard/ProcurementChainWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { ProcurementChainStatus } from "@/components/procurement/ProcurementChainStatus";

export function ProcurementChainWidget({ taskIds }: { taskIds: string[] }) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  if (!activeTaskId && taskIds.length > 0) {
    setActiveTaskId(taskIds[0]);
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Active Procurement Chains
        </h3>
        <span className="text-[10px] font-black text-muted-foreground">
          {taskIds.length} active
        </span>
      </div>

      {taskIds.length > 0 ? (
        <div className="space-y-4">
          <select 
            value={activeTaskId || ""}
            onChange={(e) => setActiveTaskId(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs font-bold"
          >
            {taskIds.map((id) => (
              <option key={id} value={id}>Task #{id.slice(0, 8)}</option>
            ))}
          </select>
          
          {activeTaskId && <ProcurementChainStatus taskId={activeTaskId} />}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">
          No active procurement chains
        </p>
      )}
    </div>
  );
}