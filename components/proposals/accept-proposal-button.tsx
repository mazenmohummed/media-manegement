// components/proposals/accept-proposal-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export function AcceptProposalButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept proposal");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 rounded-md px-3 py-2 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5" />
      )}
      Accept & Generate Contract
    </button>
  );
}