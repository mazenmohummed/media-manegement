// components/leads/lead-status-select.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { LEAD_STATUS_CONFIG } from "@/lib/constants/lead-status";

interface LeadStatusSelectProps {
  leadId: string;
  currentStatus: LeadStatus;
}

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: LeadStatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === status) return;

    let disqualifiedReason: string | undefined;

    // Handle mandatory reason input when marking as DISQUALIFIED
    if (newStatus === LeadStatus.DISQUALIFIED) {
      const reason = prompt("Please provide a reason for disqualifying this lead:");
      if (!reason || !reason.trim()) return;
      disqualifiedReason = reason.trim();
    }

    // Optimistically update local state
    const previousStatus = status;
    setStatus(newStatus);

    startTransition(async () => {
      try {
        let response: Response;

        if (newStatus === LeadStatus.CONVERTED) {
          // Route to dedicated POST endpoint for transaction & Opportunity creation
          response = await fetch(`/api/leads/${leadId}/convert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        } else {
          // Route to standard PATCH endpoint
          response = await fetch(`/api/leads/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: newStatus,
              disqualifiedReason,
            }),
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update status");
        }

        // Refresh Server Components to sync UI with backend
        router.refresh();
      } catch (error: any) {
        console.error("Failed to update status:", error);
        alert(error.message || "An error occurred while updating status");
        // Rollback optimistic update on failure
        setStatus(previousStatus);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        disabled={isPending || status === LeadStatus.CONVERTED}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          handleStatusChange(e.target.value as LeadStatus)
        }
        className="w-[160px] bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      >
        {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
          <option key={key} value={key} className="bg-zinc-900 text-zinc-100">
            {config.label}
          </option>
        ))}
      </select>
    </div>
  );
}