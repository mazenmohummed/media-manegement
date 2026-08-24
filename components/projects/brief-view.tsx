// components/projects/brief-view.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit3, Save, X, ArrowLeft, Loader2, Plus, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { BriefStatus } from "@prisma/client";

interface BriefViewProps {
  projectId: string;
  projectName: string;
  currency: string;
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
}

export function BriefView({ projectId, projectName, currency, initialBrief }: BriefViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
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

  const handleSave = async (e: React.FormEvent) => {
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
        setIsEditing(false);
        router.refresh();
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {projectName}
        </Link>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-xs"
              size="sm"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Brief
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData(initialBrief);
                  setIsEditing(false);
                }}
                className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-xs"
                size="sm"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-sm">
        {/* Header Metadata */}
        <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            {isEditing ? (
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-lg font-bold w-full max-w-md"
              />
            ) : (
              <h1 className="text-xl font-bold text-zinc-100">{formData.title}</h1>
            )}
            <p className="text-xs text-zinc-400 mt-0.5">Project Creative Brief & Strategy Blueprint</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">Status:</span>
            {isEditing ? (
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
            ) : (
              <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-purple-300 text-xs gap-1.5 py-1">
                <Clock className="w-3 h-3 text-purple-400" />
                {formData.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-950/60 border border-zinc-800 p-3.5 rounded-lg space-y-1">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Allocated Budget</span>
            {isEditing ? (
              <Input
                type="number"
                value={formData.budget ?? ""}
                onChange={(e) => handleChange("budget", e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs mt-1"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-200">
                {formData.budget ? `${formData.budget.toLocaleString()} ${currency}` : "Not Specified"}
              </p>
            )}
          </div>
        </div>

        {/* Objectives Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Objectives & Strategy Summary</h3>
          {isEditing ? (
            <Textarea
              rows={5}
              value={formData.objectives}
              onChange={(e) => handleChange("objectives", e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs leading-relaxed"
            />
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-lg text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {formData.objectives || "No objectives provided."}
            </div>
          )}
        </div>

        {/* Target Audience Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Target Audience & Personas</h3>
          {isEditing ? (
            <Textarea
              rows={5}
              value={formData.audience || ""}
              onChange={(e) => handleChange("audience", e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs leading-relaxed"
            />
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-lg text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {formData.audience || "No audience details provided."}
            </div>
          )}
        </div>

        {/* Key Message Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Key Message / Core Value</h3>
          {isEditing ? (
            <Input
              value={formData.keyMessage || ""}
              onChange={(e) => handleChange("keyMessage", e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs"
            />
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-lg text-xs text-zinc-300">
              {formData.keyMessage || "No key message specified."}
            </div>
          )}
        </div>

        {/* Deliverables Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Deliverables</h3>
          {isEditing && (
            <div className="flex gap-2 pb-2">
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
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {formData.deliverables.length > 0 ? (
              formData.deliverables.map((item, idx) => (
                <Badge key={idx} variant="outline" className="bg-zinc-950 text-zinc-300 border-zinc-800 text-xs gap-1.5 py-1">
                  {item}
                  {isEditing && (
                    <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-zinc-500 hover:text-zinc-300">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-zinc-500 italic">No deliverables listed.</span>
            )}
          </div>
        </div>

        {/* References Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">References & Research Notes</h3>
          {isEditing && (
            <div className="flex gap-2 pb-2">
              <Input
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                placeholder="Add reference or research note..."
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
          )}
          <div className="space-y-1.5 pt-1">
            {formData.references.length > 0 ? (
              formData.references.map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-300">
                  <span className="truncate">{ref}</span>
                  {isEditing && (
                    <button type="button" onClick={() => handleRemoveReference(idx)} className="text-zinc-500 hover:text-red-400 shrink-0 ml-2">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <span className="text-xs text-zinc-500 italic">No references added.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}