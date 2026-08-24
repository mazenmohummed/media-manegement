"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  _count?: { items: number };
}

interface AcceptProposalButtonProps {
  proposalId: string;
  templates: TemplateOption[];
}

export function AcceptProposalButton({
  proposalId,
  templates,
}: AcceptProposalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept proposal");
      }

      if (data.contract?.id) {
        router.push(`/dashboard/contracts/${data.contract.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          Accept & Sign
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>Accept Proposal & Generate Contract</DialogTitle>
          <DialogDescription className="text-zinc-400">
            This will mark the proposal as accepted, create a signed contract,
            and spin up a project. Select a template to auto-populate the full
            work breakdown structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Project Template{" "}
              <span className="text-zinc-600">(Optional)</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">No template — Empty Project</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t._count?.items ?? 0} items)
                </option>
              ))}
            </select>

            {selectedTemplate && (
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 text-zinc-300">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-medium">{selectedTemplate.name}</span>
                </div>
                {selectedTemplate.description && (
                  <p className="text-zinc-500">
                    {selectedTemplate.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-zinc-400 mt-1">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>
                    {selectedTemplate._count?.items ?? 0} milestone/task items
                    will be instantiated
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Impact Preview */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-emerald-400 mb-1">
              What happens next:
            </p>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>Contract created and linked to proposal</li>
              <li>Project generated from contract scope</li>
              {selectedTemplateId ? (
                <>
                  <li className="text-emerald-300/90">
                    <span className="font-medium">
                      {selectedTemplate?._count?.items ?? 0} WBS items
                    </span>{" "}
                    cloned from "{selectedTemplate?.name}"
                  </li>
                  <li className="text-emerald-300/90">
                    Milestones + Tasks created with zero manual entry
                  </li>
                </>
              ) : (
                <li>Empty project created (add tasks manually later)</li>
              )}
              <li>Client auto-created from lead if needed</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processing..." : "Confirm & Sign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}