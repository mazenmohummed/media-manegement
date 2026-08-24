"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Save, X, DollarSign, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlannedExpenseItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalEstimated: number;
  status: string;
}

interface Props {
  taskId: string;
  initialExpenses: PlannedExpenseItem[];
}

export default function TaskPlannedExpensesManager({ taskId, initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<PlannedExpenseItem[]>(initialExpenses);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for creating or editing line items
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("EQUIPMENT");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("0");
  const [taxRate, setTaxRate] = useState<string>("0");

  // Real-time calculation for the active input row
  const computedRowTotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const u = parseFloat(unitCost) || 0;
    const t = parseFloat(taxRate) || 0;
    return q * u * (1 + t / 100);
  }, [quantity, unitCost, taxRate]);

  // Overall cumulative sum computed in real time across all existing items
  const grandTotalEstimated = useMemo(() => {
    return expenses.reduce((acc, item) => acc + (item.totalEstimated || 0), 0);
  }, [expenses]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const payload = {
      itemName,
      category,
      quantity: parseFloat(quantity) || 1,
      unitCost: parseFloat(unitCost) || 0,
      taxRate: parseFloat(taxRate) || 0,
    };

    if (editingId) {
      // Update existing item via API
      const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses(expenses.map((ex) => (ex.id === editingId ? data.plannedExpense : ex)));
        resetForm();
      }
    } else {
      // Create new item via API
      const res = await fetch(`/api/tasks/${taskId}/planned-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses([data.plannedExpense, ...expenses]);
        resetForm();
      }
    }
  };

  const handleConvertToActual = async (id: string) => {
    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${id}/convert`, {
      method: "POST",
    });

    if (res.ok) {
      alert("Successfully converted planned expense into an actual expense!");
      // Optionally update the local state status if desired
      setExpenses(
        expenses.map((ex) => (ex.id === id ? { ...ex, status: "APPROVED" } : ex))
      );
    } else {
      alert("Failed to convert expense.");
    }
  };

  const startEdit = (item: PlannedExpenseItem) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setCategory(item.category);
    setQuantity(item.quantity.toString());
    setUnitCost(item.unitCost.toString());
    setTaxRate(item.taxRate.toString());
  };

  const resetForm = () => {
    setEditingId(null);
    setItemName("");
    setCategory("EQUIPMENT");
    setQuantity("1");
    setUnitCost("0");
    setTaxRate("0");
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setExpenses(expenses.filter((ex) => ex.id !== id));
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-100">Planned Expenses</h2>
        </div>
        <div className="text-sm font-medium text-zinc-400">
          Total Estimated: <span className="text-purple-400 font-bold">${grandTotalEstimated.toFixed(2)}</span>
        </div>
      </div>

      {/* Input / Form Row for Add or Edit */}
      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Item Name</label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Item name..."
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Quantity</label>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Unit Cost</label>
          <Input
            type="number"
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Tax Rate (%)</label>
          <Input
            type="number"
            step="any"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div className="flex flex-col justify-end">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Auto Total</span>
          <div className="h-9 px-3 flex items-center bg-zinc-900 border border-zinc-800 rounded-md text-xs font-semibold text-purple-300">
            ${computedRowTotal.toFixed(2)}
          </div>
        </div>

        <div className="sm:col-span-6 flex items-center justify-end gap-2 pt-2">
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400 text-xs">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
          <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
            {editingId ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            {editingId ? "Update Line Item" : "Add Line Item"}
          </Button>
        </div>
      </form>

      {/* List of existing planned expenses */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">No planned expenses added yet.</p>
        ) : (
          expenses.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 px-4 py-3 rounded-lg text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200">{item.itemName}</span>
                <div className="text-zinc-500 text-[11px] flex gap-3">
                  <span>Qty: {item.quantity}</span>
                  <span>Unit: ${item.unitCost.toFixed(2)}</span>
                  <span>Tax: {item.taxRate}%</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-purple-400">${item.totalEstimated.toFixed(2)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvertToActual(item.id)}
                    className="h-7 border-purple-700/60 text-purple-300 hover:bg-purple-950/40 text-[11px]"
                  >
                    <Receipt className="w-3 h-3 mr-1" /> Convert
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-7 w-7 text-zinc-400 hover:text-zinc-200">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-7 w-7 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}