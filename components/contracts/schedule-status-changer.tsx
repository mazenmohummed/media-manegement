"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScheduleStatusChangerProps {
  scheduleId: string;
  initialIsActive: boolean;
}

export function ScheduleStatusChanger({
  scheduleId,
  initialIsActive,
}: ScheduleStatusChangerProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (value: string) => {
    const newStatus = value === "active";
    setIsLoading(true);

    try {
      const response = await fetch(`/api/recurring-schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setIsActive(newStatus);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      disabled={isLoading}
      value={isActive ? "active" : "inactive"}
      onValueChange={handleStatusChange}
    >
      <SelectTrigger className="h-7 w-[100px] text-xs bg-zinc-900 border-zinc-800">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800 text-xs">
        <SelectItem value="active" className="text-emerald-400 focus:bg-zinc-800">
          Active
        </SelectItem>
        <SelectItem value="inactive" className="text-zinc-400 focus:bg-zinc-800">
          Inactive
        </SelectItem>
      </SelectContent>
    </Select>
  );
}