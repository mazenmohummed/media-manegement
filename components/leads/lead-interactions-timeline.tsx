// components/leads/lead-interactions-timeline.tsx
"use client";

import { useState } from "react";
import { InteractionType } from "@prisma/client";
import {
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Presentation,
  FileCheck,
  FileText,
  Clock,
  Plus,
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

export interface InteractionItem {
  id: string;
  type: InteractionType;
  summary: string;
  occurredAt: string | Date;
  createdBy?: User | null;
}

const TYPE_CONFIG: Record<
  InteractionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  MEETING: { label: "Meeting", icon: Calendar, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  CALL: { label: "Call", icon: Phone, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  EMAIL: { label: "Email", icon: Mail, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  WHATSAPP: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  PRESENTATION: { label: "Presentation", icon: Presentation, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  PROPOSAL_SENT: { label: "Proposal Sent", icon: FileCheck, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  NOTE: { label: "Note", icon: FileText, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export function LeadInteractionsTimeline({
  leadId,
  initialInteractions = [],
}: {
  leadId: string;
  initialInteractions?: InteractionItem[];
}) {
  const [interactions, setInteractions] = useState<InteractionItem[]>(
    [...initialInteractions].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
  );

  const [type, setType] = useState<InteractionType>("NOTE");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, summary, occurredAt }),
      });

      if (!res.ok) throw new Error("Failed to create interaction");

      const newEntry: InteractionItem = await res.json();

      setInteractions((prev) =>
        [newEntry, ...prev].sort(
          (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )
      );

      setSummary("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Log Interaction Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-4"
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as InteractionType[]).map((t) => {
            const Icon = TYPE_CONFIG[t].icon;
            const isSelected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isSelected
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {TYPE_CONFIG[t].label}
              </button>
            );
          })}
        </div>

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summary of discussion, key takeaways, or next steps..."
          rows={3}
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Occurred at:</span>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !summary.trim()}
            className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Interaction
          </button>
        </div>
      </form>

      {/* Reverse-Chronological Timeline Display */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
        {interactions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">
            No interactions recorded yet. Log the first activity above.
          </p>
        ) : (
          interactions.map((item) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.NOTE;
            const Icon = config.icon;
            const formattedDate = new Date(item.occurredAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={item.id} className="relative group">
                <div
                  className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${config.color}`}
                >
                  <Icon className="h-3 w-3" />
                </div>

                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">
                      {config.label}
                    </span>
                    <time className="text-zinc-500 font-mono">
                      {formattedDate}
                    </time>
                  </div>

                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {item.summary}
                  </p>

                  {item.createdBy?.name && (
                    <div className="pt-1 text-[11px] text-zinc-500">
                      Logged by {item.createdBy.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}