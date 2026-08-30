// components/procurement/ProcurementChainStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, Clock, AlertCircle, ChevronRight } from "lucide-react";

interface ChainStep {
  id: string;
  label: string;
  status: "completed" | "active" | "pending" | "blocked";
  date?: string;
}

export function ProcurementChainStatus({ taskId }: { taskId: string }) {
  const [chain, setChain] = useState<{
    steps: ChainStep[];
    currentStep: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChain() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/procurement-chain`);
        const data = await res.json();
        setChain(data);
      } catch (error) {
        console.error("Failed to fetch procurement chain:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchChain();
  }, [taskId]);

  if (loading) {
    return <div className="animate-pulse">Loading procurement chain...</div>;
  }

  if (!chain) {
    return <div>No procurement chain found</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider">Procurement Chain</h3>
      
      <div className="space-y-2">
        {chain.steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {step.status === "completed" && (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              )}
              {step.status === "active" && (
                <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
              )}
              {step.status === "pending" && (
                <Circle className="w-5 h-5 text-muted-foreground/30" />
              )}
              {step.status === "blocked" && (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  step.status === "completed" ? "text-emerald-500" :
                  step.status === "active" ? "text-blue-500" :
                  step.status === "blocked" ? "text-rose-500" :
                  "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Connector */}
            {index < chain.steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}