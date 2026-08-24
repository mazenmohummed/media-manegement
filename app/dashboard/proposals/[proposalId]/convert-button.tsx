"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";

interface Props {
  proposalId: string;
}

export function ConvertToProjectButton({ proposalId }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert() {
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${proposalId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to the newly created project
      router.push(`/dashboard/projects/${data.projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleConvert}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-emerald-950/20"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Launching Project...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            Convert to Contract & Launch Project
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded">
          {error}
        </p>
      )}
    </div>
  );
}