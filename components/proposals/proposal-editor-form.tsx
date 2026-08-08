// components/proposals/proposal-editor-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ProposalData {
  id: string;
  proposalNo: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  validUntil: Date | string | null;
  scope: string | null;
  risks: string | null;
  assumptions: string | null;
  paymentSchedule: string | null;
  lineItems: LineItem[];
}

export function ProposalEditorForm({ initialProposal }: { initialProposal: ProposalData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [proposalNo, setProposalNo] = useState(initialProposal.proposalNo || "");
  const [status, setStatus] = useState(initialProposal.status);
  const [currency, setCurrency] = useState(initialProposal.currency);
  const [validUntil, setValidUntil] = useState(
    initialProposal.validUntil ? new Date(initialProposal.validUntil).toISOString().split("T")[0] : ""
  );
  const [scope, setScope] = useState(initialProposal.scope || "");
  const [risks, setRisks] = useState(initialProposal.risks || "");
  const [assumptions, setAssumptions] = useState(initialProposal.assumptions || "");
  const [paymentSchedule, setPaymentSchedule] = useState(initialProposal.paymentSchedule || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(initialProposal.lineItems || []);

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? Number(value) || 0 : updated[index].quantity;
      const price = field === "unitPrice" ? Number(value) || 0 : updated[index].unitPrice;
      updated[index].total = qty * price;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const computedTotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${initialProposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalNo,
          status,
          currency,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          scope,
          risks,
          assumptions,
          paymentSchedule,
          lineItems,
        }),
      });

      if (!res.ok) throw new Error("Failed to update proposal");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error saving proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Proposal Number</label>
            <Input
              value={proposalNo}
              onChange={(e) => setProposalNo(e.target.value)}
              className="bg-zinc-950 border-zinc-800 h-9 text-sm text-zinc-200 w-48"
              placeholder="e.g. PROP-001"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md h-9 px-3 text-sm text-zinc-200"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Currency</label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-zinc-950 border-zinc-800 h-9 text-sm text-zinc-200 w-24"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="line-items" className="space-y-4">
        <TabsList className="bg-zinc-950 border border-zinc-800 p-1">
          <TabsTrigger value="line-items">Line Items & Pricing</TabsTrigger>
          <TabsTrigger value="scope">Scope of Work</TabsTrigger>
          <TabsTrigger value="terms">Risks & Assumptions</TabsTrigger>
          <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="line-items" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Budget Line Items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                <div className="col-span-6">
                  <label className="text-xs text-zinc-500 block mb-1">Description</label>
                  <Input
                    value={item.description}
                    onChange={(e) => handleLineItemChange(idx, "description", e.target.value)}
                    placeholder="Service or deliverable description..."
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-500 block mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-500 block mb-1">Unit Price</label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleLineItemChange(idx, "unitPrice", e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8 font-mono"
                  />
                </div>
                <div className="col-span-1 pt-4 text-right font-mono text-xs text-zinc-300">
                  <span className="text-zinc-500 block text-[10px]">Total</span>
                  {currency} {(item.quantity * item.unitPrice).toLocaleString()}
                </div>
                <div className="col-span-1 pt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(idx)}
                    className="text-zinc-500 hover:text-red-400 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {lineItems.length === 0 && (
              <p className="text-xs text-zinc-500 italic text-center py-6">No line items added yet.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800 text-right">
            <div>
              <span className="text-xs text-zinc-500 block">Computed Proposal Total</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {currency} {computedTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scope" className="space-y-3">
          <label className="text-xs font-semibold text-zinc-300 block">Scope of Work</label>
          <Textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Detailed project scope, deliverables, and milestones..."
            className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs min-h-[160px]"
          />
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 block">Project Risks</label>
            <Textarea
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              placeholder="Potential blockers, dependencies, or risks..."
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 block">Assumptions</label>
            <Textarea
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              placeholder="Client-provided assets, timelines, feedback windows..."
              className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs min-h-[100px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-3">
          <label className="text-xs font-semibold text-zinc-300 block">Payment Schedule & Terms</label>
          <Textarea
            value={paymentSchedule}
            onChange={(e) => setPaymentSchedule(e.target.value)}
            placeholder="e.g. 50% upfront deposit, 50% upon final delivery..."
            className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs min-h-[160px]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}