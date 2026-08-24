// components/opportunities/OpportunityWorkspaceForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming standard UI tabs component
import { Plus, Trash2, Save, FileText, CheckCircle2 } from "lucide-react";

export default function OpportunityWorkspaceForm({ opportunity }: { opportunity: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(opportunity);

  // Helper handlers for repeatable arrays (Personas, Competitors, Products)
  const addItem = (field: "personas" | "competitors" | "products", emptyObj: any) => {
    setForm({ ...form, [field]: [...form[field], emptyObj] });
  };

  const removeItem = (field: string, index: number) => {
    const list = [...form[field]];
    list.splice(index, 1);
    setForm({ ...form, [field]: list });
  };

  const updateItemField = (field: string, index: number, key: string, value: any) => {
    const list = [...form[field]];
    list[index][key] = value;
    setForm({ ...form, [field]: list });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update opportunity");
      router.refresh();
    } catch (err) {
      alert("Error saving changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{form.name}</h1>
          <p className="text-xs text-zinc-400">Stage: <span className="text-purple-400 font-medium">{form.stage}</span></p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save Workspace"}
        </button>
      </div>

      {/* Tabs for Discovery, Strategy, Proposals */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <div className="space-y-8">
          {/* Section 1: Discovery Brief */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">1. Discovery Brief & Parameters</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Company Mission</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200"
                  rows={3}
                  value={form.companyMission || ""}
                  onChange={(e) => setForm({ ...form, companyMission: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Brand Values</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200"
                  rows={3}
                  value={form.brandValues || ""}
                  onChange={(e) => setForm({ ...form, brandValues: e.target.value })}
                />
              </div>
            </div>

            {/* Personas Repeater */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-zinc-300">Target Personas</h3>
                <button
                  onClick={() => addItem("personas", { name: "", demographics: "", goals: "", frustrations: "" })}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Persona
                </button>
              </div>
              {form.personas.map((persona: any, idx: number) => (
                <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3 relative">
                  <button
                    onClick={() => removeItem("personas", idx)}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Persona Name"
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
                      value={persona.name}
                      onChange={(e) => updateItemField("personas", idx, "name", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Demographics"
                      className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
                      value={persona.demographics || ""}
                      onChange={(e) => updateItemField("personas", idx, "demographics", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Strategy Configuration */}
          <div className="space-y-4 pt-6 border-t border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">2. Campaign & Launch Strategy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Marketing Strategy</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200"
                  rows={2}
                  value={form.marketingStrategy || ""}
                  onChange={(e) => setForm({ ...form, marketingStrategy: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Creative Strategy</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200"
                  rows={2}
                  value={form.creativeStrategy || ""}
                  onChange={(e) => setForm({ ...form, creativeStrategy: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}