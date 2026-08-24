"use client";

import { QuotationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react"; // or React's useTransition

interface StatusButtonsProps {
  quotationId: string;
  currentStatus: QuotationStatus;
}

const statuses: { label: string; value: QuotationStatus; color: string }[] = [
  { label: "Requested", value: QuotationStatus.REQUESTED, color: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  { label: "Received", value: QuotationStatus.RECEIVED, color: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
  { label: "Compared", value: QuotationStatus.COMPARED, color: "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" },
  { label: "Selected", value: QuotationStatus.SELECTED, color: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
  { label: "Rejected", value: QuotationStatus.REJECTED, color: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" },
  { label: "Expired", value: QuotationStatus.EXPIRED, color: "border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/10" },
];

export function QuotationStatusButtons({ quotationId, currentStatus }: StatusButtonsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  async function handleStatusChange(newStatus: QuotationStatus) {
    if (newStatus === currentStatus) return;
    setLoadingStatus(newStatus);

    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStatus(null);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Status Update</p>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const isActive = currentStatus === s.value;
          const isLoading = loadingStatus === s.value;

          return (
            <Button
              key={s.value}
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleStatusChange(s.value)}
              className={`text-xs font-mono transition-all ${s.color} ${
                isActive ? "bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500 shadow-sm" : "bg-zinc-950/40 border-zinc-800"
              }`}
            >
              {isLoading ? "Updating..." : s.label}
              {isActive && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}