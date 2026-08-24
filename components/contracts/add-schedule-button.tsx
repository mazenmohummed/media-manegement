"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AddScheduleButton() {
  const params = useParams();
  const contractId = params?.contractId as string | undefined;

  if (!contractId) {
    return (
      <Link href="/dashboard/contracts">
        <Button className="bg-purple-600 hover:bg-purple-500 text-zinc-100 gap-2">
          <Plus className="w-4 h-4" /> Add Schedule (Select Contract)
        </Button>
      </Link>
    );
  }

  return (
    <Link href={`/dashboard/contracts/${contractId}/recurring-schedules/new`}>
      <Button className="bg-purple-600 hover:bg-purple-500 text-zinc-100 gap-2">
        <Plus className="w-4 h-4" /> Add Schedule
      </Button>
    </Link>
  );
}