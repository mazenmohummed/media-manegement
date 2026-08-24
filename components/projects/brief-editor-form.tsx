// components/projects/brief-editor-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { BriefStatus } from "@prisma/client";

interface BriefEditorFormProps {
  projectId: string;
  initialBrief: {
    id: string;
    title: string;
    status: BriefStatus;
    budget: number | null;
    objectives: string;
    audience: string | null;
    keyMessage: string | null;
    deliverables: string[];
    references: string[];
  };
  projectName: string;
  currency: string;
}

export function BriefEditorForm({
  projectId,
  initialBrief,
  projectName,
  currency,
}: BriefEditorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialBrief);
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newReference, setNewReference] = useState("");

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setFormData((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable.trim()],
    }));
    setNewDeliverable("");
  };

  const handleRemoveDeliverable = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  };

  const handleAddReference = () => {
    if (!newReference.trim()) return;
    setFormData((prev) => ({
      ...prev,
      references: [...prev.references, newReference.trim()],
    }));
    setNewReference("");
  };

  const handleRemoveReference = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        router.refresh();
        alert("Creative Brief updated successfully!");
      } else {
        alert(data.error || "Failed to update brief.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {projectName}
        </Link>
        <Button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Creative Brief</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Pre-filled from opportunity discovery data.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-400">Status:</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              {Object.values(BriefStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Brief Title</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Budget ({currency})</label>
            <Input
              type="number"
              value={formData.budget ?? ""}
              onChange={(e) => handleChange("budget", e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
            />
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Objectives & Strategy Summary</label>
          <Textarea
            rows={5}
            value={formData.objectives}
            onChange={(e) => handleChange("objectives", e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs leading-relaxed"
            required
          />
        </div>

        {/* Audience */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Target Audience & Personas</label>
          <Textarea
            rows={5}
            value={formData.audience || ""}
            onChange={(e) => handleChange("audience", e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs leading-relaxed"
          />
        </div>

        {/* Key Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Key Message / Core Value</label>
          <Input
            value={formData.keyMessage || ""}
            onChange={(e) => handleChange("keyMessage", e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
          />
        </div>

        {/* Deliverables List */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">Deliverables</label>
          <div className="flex gap-2">
            <Input
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              placeholder="Add new deliverable..."
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDeliverable();
                }
              }}
            />
            <Button type="button" onClick={handleAddDeliverable} variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {formData.deliverables.map((item, idx) => (
              <Badge key={idx} variant="outline" className="bg-zinc-950 text-zinc-300 border-zinc-800 text-xs gap-1.5 py-1">
                {item}
                <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* References / Notes List */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">References & Research Notes</label>
          <div className="flex gap-2">
            <Input
              value={newReference}
              onChange={(e) => setNewReference(e.target.value)}
              placeholder="Add reference or research note link..."
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddReference();
                }
              }}
            />
            <Button type="button" onClick={handleAddReference} variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1.5 pt-1">
            {formData.references.map((ref, idx) => (
              <div key={idx} className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-300">
                <span className="truncate">{ref}</span>
                <button type="button" onClick={() => handleRemoveReference(idx)} className="text-zinc-500 hover:text-red-400 shrink-0 ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}