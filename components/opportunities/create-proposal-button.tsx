"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateProposalButtonProps {
  opportunityId: string;
  opportunityName: string;
  budget: number | null;
  currency: string;
}

export function CreateProposalButton({
  opportunityId,
  opportunityName,
  budget,
  currency,
}: CreateProposalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30); // 30-day default validity

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          // Timestamp-based suffix — far lower collision risk than a 4-digit
          // random number against the `proposalNo @unique` constraint.
          proposalNo: `PROP-${Date.now().toString(36).toUpperCase()}`,
          currency,
          validUntil: validUntil.toISOString(),
          // Seed one line item from the opportunity's deal value so the
          // proposal isn't a blank slate disconnected from the pipeline.
          lineItems: budget
            ? [{ description: opportunityName, quantity: 1, unitPrice: budget }]
            : [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create proposal");
      }

      const newProposal = await res.json();
      router.push(`/dashboard/proposals/${newProposal.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error creating proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCreate}
      disabled={loading}
      className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
      Create Proposal
    </Button>
  );
}