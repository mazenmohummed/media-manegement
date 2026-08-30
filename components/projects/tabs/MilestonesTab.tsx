"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  budget: number | null;
  status: string;
  deadline: string | null;
}

export function MilestonesTab({ projectId, currency }: { projectId: string; currency: string }) {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", budget: "", deadline: "" });

  const load = () =>
    fetch(`/api/projects/${projectId}/milestones`)
      .then((r) => r.json())
      .then((d) => setMilestones(d.milestones ?? []))
      .catch(() => setMilestones([]));

  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          budget: form.budget ? Number(form.budget) : null,
          deadline: form.deadline || null,
        }),
      });
      if (res.ok) {
        setForm({ name: "", description: "", budget: "", deadline: "" });
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMilestones((prev) => prev?.filter((m) => m.id !== id) ?? null);
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    setMilestones((prev) => prev?.map((m) => (m.id === id ? { ...m, status } : m)) ?? null);
    await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  if (milestones === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Milestone"}
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Milestone name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder={`Budget (${currency})`}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
            className="text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md"
          >
            {saving ? "Saving..." : "Create Milestone"}
          </button>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No milestones yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {milestones.map((m) => (
            <div key={m.id} className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200">{m.name}</span>
                <button onClick={() => handleDelete(m.id)} className="text-zinc-600 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
              {m.description && <p className="text-zinc-400 text-[10px]">{m.description}</p>}
              <p className="text-zinc-400">
                {m.deadline ? `Due: ${new Date(m.deadline).toLocaleDateString()}` : "No deadline"}
              </p>
              {m.budget != null && (
                <p className="text-zinc-400">Budget: {currency} {m.budget.toLocaleString()}</p>
              )}
              <select
                value={m.status}
                onChange={(e) => handleStatusChange(m.id, e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[10px] text-zinc-300 mt-1"
              >
                {["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}