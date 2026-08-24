"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink, FilePlus, Plus, Trash } from "lucide-react";
import Link from "next/link";

interface ItemRow {
  description: string;
  quantity: number;
  unitCost: number;
}

interface PlannedOrderActionsProps {
  id: string;
  status: string;
  initialData?: {
    notes?: string | null;
    expectedDeliveryDate?: string | null;
    currency?: string;
    totalAmount?: number;
    quotationId?: string | null;
    items?: ItemRow[];
  };
}

export default function PlannedOrderActions({ id, status, initialData }: PlannedOrderActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedPo, setConvertedPo] = useState<{ id: string; poNo: string } | null>(null);

  // Initialize state with passed initialData or fallbacks
  const [items, setItems] = useState<ItemRow[]>(
    initialData?.items && initialData.items.length > 0 
      ? initialData.items 
      : [{ description: "", quantity: 1, unitCost: 0 }]
  );
  const [currency, setCurrency] = useState(initialData?.currency || "EGP");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDeliveryDate || "");
  const [quotationId, setQuotationId] = useState(initialData?.quotationId || "");

  const handleAction = async (actionType: "APPROVE" | "REJECT" | "CONVERT") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/planned-purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process action");
      }

      const data = await res.json();
      if (actionType === "CONVERT") {
        setConvertedPo({ id: data.id, poNo: data.poNo });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this planned purchase order?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/planned-purchase-orders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/procurement/planned-purchase-orders");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
      setLoading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      currency,
      notes,
      expectedDeliveryDate: expectedDate || null,
      quotationId: quotationId || null,
      items: items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      })),
    };

    try {
      const res = await fetch(`/api/planned-purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update record");
      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  const addItemRow = () => setItems([...items, { description: "", quantity: 1, unitCost: 0 }]);
  const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItemRow = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  if (convertedPo) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>
          Converted to{" "}
          <Link
            href={`/dashboard/vendors/purchase-orders/${convertedPo.id}`}
            className="font-semibold underline underline-offset-2 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            {convertedPo.poNo} <ExternalLink className="w-3 h-3" />
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {status === "PENDING" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
              onClick={() => handleAction("APPROVE")}
              disabled={loading}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
              onClick={() => handleAction("REJECT")}
              disabled={loading}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </>
        )}

        {status === "APPROVED" && (
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            disabled={loading}
            onClick={() => handleAction("CONVERT")}
          >
            <FilePlus className="w-3.5 h-3.5 mr-1" /> Convert to PO
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
          onClick={() => setIsEditOpen(true)}
          disabled={loading}
        >
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      {/* Comprehensive Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8">
            <h2 className="text-lg font-bold text-zinc-100">Edit Planned Order</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

          
              {/* Line Items Management */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Line Items</label>
                  <Button type="button" size="sm" variant="ghost" onClick={addItemRow} className="text-indigo-400 hover:text-indigo-300 text-xs h-7">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItemRow(idx, "description", e.target.value)}
                      required
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(idx, "quantity", parseFloat(e.target.value) || 0)}
                      required
                      className="w-16 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Unit Cost"
                      value={item.unitCost}
                      onChange={(e) => updateItemRow(idx, "unitCost", parseFloat(e.target.value) || 0)}
                      required
                      className="w-24 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItemRow(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}