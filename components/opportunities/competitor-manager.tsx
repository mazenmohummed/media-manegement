"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Target, Loader2 } from "lucide-react";
import { DiscoveryCompetitor } from "@prisma/client";

interface CompetitorManagerProps {
  opportunityId: string;
  initialCompetitors: DiscoveryCompetitor[];
}

export function CompetitorManager({ opportunityId, initialCompetitors }: CompetitorManagerProps) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<DiscoveryCompetitor[]>(initialCompetitors);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<DiscoveryCompetitor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    strengths: "",
    weaknesses: "",
  });

  const openModal = (competitor?: DiscoveryCompetitor) => {
    if (competitor) {
      setSelectedCompetitor(competitor);
      setFormData({
        name: competitor.name || "",
        strengths: competitor.strengths || "",
        weaknesses: competitor.weaknesses || "",
      });
    } else {
      setSelectedCompetitor(null);
      setFormData({ name: "", strengths: "", weaknesses: "" });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedCompetitor) {
        const res = await fetch(`/api/opportunities/${opportunityId}/competitors`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedCompetitor.id, ...formData }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCompetitors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }
      } else {
        const res = await fetch(`/api/opportunities/${opportunityId}/competitors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setCompetitors((prev) => [...prev, created]);
        }
      }
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this competitor?")) return;

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/competitors?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <span>Competitors</span>
          <Target className="w-4 h-4 text-rose-400" />
        </h3>
        <button
          onClick={() => openModal()}
          className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          title="Add Competitor"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {competitors.length > 0 ? (
        <div className="space-y-3">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs space-y-1 relative group"
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold text-zinc-200">{comp.name}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(comp)}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {comp.strengths && (
                <p className="text-zinc-400">
                  <span className="text-zinc-500">Strengths:</span> {comp.strengths}
                </p>
              )}
              {comp.weaknesses && (
                <p className="text-zinc-400">
                  <span className="text-zinc-500">Weaknesses:</span> {comp.weaknesses}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 italic">No competitors recorded.</p>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-100">
              {selectedCompetitor ? "Edit Competitor" : "Add Competitor"}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Strengths</label>
                <textarea
                  value={formData.strengths}
                  onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Weaknesses</label>
                <textarea
                  value={formData.weaknesses}
                  onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}