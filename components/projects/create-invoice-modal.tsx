"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Loader2 } from "lucide-react";

interface CreateInvoiceModalProps {
  projectId: string;
  projectName: string;
  currency: string;
  totalValue: number;
}

export function CreateInvoiceModal({
  projectId,
  projectName,
  currency,
  totalValue,
}: CreateInvoiceModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState(`Invoice for project: ${projectName}`);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          taxRate: parseFloat(taxRate) || 0,
          discount: parseFloat(discount) || 0,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invoice");
      }

      setOpen(false);
      router.refresh();
      // Optional: route straight to the newly created invoice view page
      // router.push(`/dashboard/invoices/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs h-9">
          <FileText className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Generate Invoice from Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateInvoice} className="space-y-4 mt-2">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1">
            <span className="text-xs text-zinc-400">Target Project</span>
            <p className="text-sm font-semibold text-zinc-200">{projectName}</p>
            <p className="text-xs text-emerald-400 font-mono mt-1">
              Estimated Total Value: {currency} {totalValue.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="taxRate" className="text-xs text-zinc-300">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount" className="text-xs text-zinc-300">Global Discount ({currency})</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate" className="text-xs text-zinc-300">Payment Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs text-zinc-300">Invoice Notes / Terms</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}