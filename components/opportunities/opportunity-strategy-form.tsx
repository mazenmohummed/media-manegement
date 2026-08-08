"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface StrategyData {
  companyMission: string | null;
  brandValues: string | null;
  marketResearchNotes?: string | null;
  marketingStrategy: string | null;
  communicationStrategy?: string | null;
  mediaStrategy?: string | null;
  creativeStrategy: string | null;
  launchStrategy?: string | null;
  kpis: string[];
}

interface OpportunityStrategyFormProps {
  opportunityId: string;
  initialData: StrategyData;
}

const FIELD_CONFIG: {
  key: keyof Omit<StrategyData, "kpis">;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "companyMission",
    label: "Company Mission",
    placeholder: "What is the client's mission and why it matters to this engagement...",
  },
  {
    key: "brandValues",
    label: "Brand Values",
    placeholder: "Core values that should guide creative and messaging decisions...",
  },
  {
    key: "marketResearchNotes",
    label: "Market Research Notes",
    placeholder: "Findings from market/industry research relevant to this opportunity...",
  },
  {
    key: "marketingStrategy",
    label: "Marketing Strategy",
    placeholder: "High-level marketing approach and positioning...",
  },
  {
    key: "communicationStrategy",
    label: "Communication Strategy",
    placeholder: "Tone of voice, messaging pillars, channels for communication...",
  },
  {
    key: "mediaStrategy",
    label: "Media Strategy",
    placeholder: "Paid/owned/earned media approach, channel mix, budget allocation logic...",
  },
  {
    key: "creativeStrategy",
    label: "Creative Strategy",
    placeholder: "Creative direction, visual language, key concepts...",
  },
  {
    key: "launchStrategy",
    label: "Launch Strategy",
    placeholder: "Rollout plan, phasing, key milestones for go-live...",
  },
];

export function OpportunityStrategyForm({
  opportunityId,
  initialData,
}: OpportunityStrategyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpiDraft, setKpiDraft] = useState("");

  const [form, setForm] = useState<StrategyData>({
    companyMission: initialData.companyMission ?? "",
    brandValues: initialData.brandValues ?? "",
    marketResearchNotes: initialData.marketResearchNotes ?? "",
    marketingStrategy: initialData.marketingStrategy ?? "",
    communicationStrategy: initialData.communicationStrategy ?? "",
    mediaStrategy: initialData.mediaStrategy ?? "",
    creativeStrategy: initialData.creativeStrategy ?? "",
    launchStrategy: initialData.launchStrategy ?? "",
    kpis: initialData.kpis ?? [],
  });

  function updateField(key: keyof Omit<StrategyData, "kpis">, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addKpi() {
    const trimmed = kpiDraft.trim();
    if (!trimmed || form.kpis.includes(trimmed)) {
      setKpiDraft("");
      return;
    }
    setForm((prev) => ({ ...prev, kpis: [...prev.kpis, trimmed] }));
    setKpiDraft("");
  }

  function removeKpi(kpi: string) {
    setForm((prev) => ({ ...prev, kpis: prev.kpis.filter((k) => k !== kpi) }));
  }

  function resetToInitial() {
    setForm({
      companyMission: initialData.companyMission ?? "",
      brandValues: initialData.brandValues ?? "",
      marketResearchNotes: initialData.marketResearchNotes ?? "",
      marketingStrategy: initialData.marketingStrategy ?? "",
      communicationStrategy: initialData.communicationStrategy ?? "",
      mediaStrategy: initialData.mediaStrategy ?? "",
      creativeStrategy: initialData.creativeStrategy ?? "",
      launchStrategy: initialData.launchStrategy ?? "",
      kpis: initialData.kpis ?? [],
    });
    setKpiDraft("");
    setError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyMission: form.companyMission || null,
          brandValues: form.brandValues || null,
          marketResearchNotes: form.marketResearchNotes || null,
          marketingStrategy: form.marketingStrategy || null,
          communicationStrategy: form.communicationStrategy || null,
          mediaStrategy: form.mediaStrategy || null,
          creativeStrategy: form.creativeStrategy || null,
          launchStrategy: form.launchStrategy || null,
          kpis: form.kpis,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save strategy");
      }

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-zinc-400 hover:text-zinc-100 -mr-2"
      >
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Edit
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isSaving) {
            if (!next) resetToInitial();
            setOpen(next);
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Strategy & Direction</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Capture the strategic context that should inform proposals and
              creative work for this opportunity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {FIELD_CONFIG.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs text-zinc-400">
                  {label}
                </Label>
                <Textarea
                  id={key}
                  value={form[key] ?? ""}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-200 text-sm resize-none placeholder:text-zinc-600"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="kpi-input" className="text-xs text-zinc-400">
                Target KPIs
              </Label>
              <div className="flex gap-2">
                <Input
                  id="kpi-input"
                  value={kpiDraft}
                  onChange={(e) => setKpiDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKpi();
                    }
                  }}
                  placeholder="e.g. 25% increase in qualified leads"
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-600"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addKpi}
                  className="border-zinc-800 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.kpis.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.kpis.map((kpi) => (
                    <Badge
                      key={kpi}
                      variant="outline"
                      className="bg-zinc-950 text-zinc-300 border-zinc-800 text-xs gap-1 pr-1"
                    >
                      {kpi}
                      <button
                        type="button"
                        onClick={() => removeKpi(kpi)}
                        className="hover:text-red-400 transition-colors"
                        aria-label={`Remove ${kpi}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetToInitial();
                setOpen(false);
              }}
              disabled={isSaving}
              className="text-zinc-300 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Strategy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}