"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateProjectStarterProps {
  templateId: string;
  templateName: string;
  clients: { id: string; clientName: string }[];
}

export function TemplateProjectStarter({
  templateId,
  templateName,
  clients,
}: TemplateProjectStarterProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!clientId || !projectName) return alert("Client and project name are required");

    setLoading(true);
    try {
      const res = await fetch("/api/projects/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          projectName,
          clientId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      router.push(`/dashboard/projects/${data.id}`);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-purple-500/20 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Start from Template
          </h2>
          <p className="text-xs text-zinc-400">
            Using <span className="text-purple-400 font-medium">{templateName}</span> — 
            milestones and tasks will be auto-generated.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Project Name *</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Ramadan Campaign 2026"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-zinc-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Client *</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Generating WBS..." : "Create Project from Template"}
      </Button>

      <p className="text-[10px] text-zinc-500 text-center">
        This will create the project, all milestones, and all tasks in one
        transaction. You can edit them afterward.
      </p>
    </div>
  );
}