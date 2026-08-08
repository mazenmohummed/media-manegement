"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    companyName?: string | null;
    contactName?: string | null;
    estimatedBudget?: number | null;
    currency?: string | null;
    expectedCloseDate?: Date | string | null;
  };
}

export function ConvertLeadModal({
  isOpen,
  onClose,
  lead,
}: ConvertLeadModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: `${lead.companyName || lead.contactName || "Lead"} - Opportunity`,
    value: lead.estimatedBudget ?? "",
    expectedCloseDate: lead.expectedCloseDate
      ? new Date(lead.expectedCloseDate).toISOString().split("T")[0]
      : "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert lead");

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Convert to Opportunity
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Pre-filled with lead data. Review details to complete conversion.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-950/40 border border-red-900/50 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Opportunity Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Deal Value ({lead.currency || "USD"})
            </label>
            <input
              type="number"
              step="any"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Target Close Date
            </label>
            <input
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) =>
                setFormData({ ...formData, expectedCloseDate: e.target.value })
              }
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Convert Deal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}