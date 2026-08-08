"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import CreateClientCard from "@/components/opportunities/CreateClientCard";

interface CreateClientButtonProps {
  agencyId: string;
  opportunityId?: string;
}

export function CreateClientButton({
  agencyId,
  opportunityId,
}: CreateClientButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <UserPlus className="w-4 h-4 text-purple-400" />
        Create Client
      </button>

      {isOpen && (
        <CreateClientCard
          agencyId={agencyId}
          opportunityId={opportunityId}
          onCancel={() => setIsOpen(false)}
          onSuccess={() => {
            setIsOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}