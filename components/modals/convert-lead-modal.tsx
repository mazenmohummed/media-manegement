"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    companyName: string;
    estimatedBudget?: number | null;
    expectedCloseDate?: string | Date | null;
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
    name: `${lead.companyName} - Deal`,
    value: lead.estimatedBudget ?? 0,
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
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to convert lead");
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Convert Lead to Opportunity</h2>
        <p className="mt-1 text-sm text-gray-500">
          This will update the lead status to CONVERTED and create a new opportunity deal.
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Opportunity Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deal Value
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expected Close Date
            </label>
            <input
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) =>
                setFormData({ ...formData, expectedCloseDate: e.target.value })
              }
              className="mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Converting..." : "Convert Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}