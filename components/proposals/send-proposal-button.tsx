// components/proposals/send-proposal-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SendProposalButton({
  proposalId,
  currentStatus,
  hasValidUntil,
}: {
  proposalId: string;
  currentStatus: string;
  hasValidUntil: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (currentStatus !== "DRAFT") return null; // only actionable from DRAFT

  const handleSend = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { status: "SENT" };
      if (!hasValidUntil) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        body.validUntil = validUntil.toISOString();
      }
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send proposal");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error sending proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleSend}
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      Send Proposal
    </Button>
  );
} 