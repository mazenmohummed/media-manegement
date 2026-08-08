"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";

interface OpportunityHeaderEditFormProps {
  opportunityId: string;
  initialData: {
    name: string;
    stage: string;
    budget: number | null;
    currency: string;
    expectedCloseDate: string | null;
    userId: string | null;    // assigned employee
    clientId: string | null;  // opportunity owner
  };
}

export function OpportunityHeaderEditForm({
  opportunityId,
  initialData,
}: OpportunityHeaderEditFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData.name,
    stage: initialData.stage,
    budget: initialData.budget,
    currency: initialData.currency,
    expectedCloseDate: initialData.expectedCloseDate,
    userId: initialData.userId,
    clientId: initialData.clientId,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === "budget") {
        return { ...prev, budget: value === "" ? null : parseFloat(value) };
      }
      if (["userId", "clientId", "expectedCloseDate"].includes(name)) {
        return { ...prev, [name]: value === "" ? null : value };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update opportunity");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <Pencil className="w-4 h-4" /> Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Edit Opportunity</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Opportunity Name
            </label>
            <input
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Stage
            </label>
            <select
              name="stage"
              required
              value={formData.stage}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option value="QUALIFICATION">QUALIFICATION</option>
              <option value="DISCOVERY">DISCOVERY</option>
              <option value="STRATEGY">STRATEGY</option>
              <option value="PROPOSAL">PROPOSAL</option>
              <option value="NEGOTIATION">NEGOTIATION</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Budget
              </label>
              <input
                name="budget"
                type="number"
                step="0.01"
                value={formData.budget ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Currency
              </label>
              <input
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Expected Close Date
            </label>
            <input
              name="expectedCloseDate"
              type="date"
              value={formData.expectedCloseDate ?? ""}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Opportunity Owner (Client ID)
              </label>
              <input
                name="clientId"
                value={formData.clientId ?? ""}
                onChange={handleChange}
                placeholder="Client ID"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Assigned Employee ID
              </label>
              <input
                name="userId"
                value={formData.userId ?? ""}
                onChange={handleChange}
                placeholder="User ID"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}