"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
// Import the type if you moved it to a types file, or define locally:
import { TaskExpenseCategory } from "./external-expeses"; 

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    itemName: string; 
    cost: string; 
    category: TaskExpenseCategory; 
    description: string 
  }) => void;
  saving: boolean;
}

export const ExpenseModal = ({ isOpen, onClose, onSave, saving }: ExpenseModalProps) => {
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    category: "EQUIPMENT" as TaskExpenseCategory, // Set default to one of your new keys
    description: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Add External Expense
            </h3>
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase ml-2 opacity-50">Item Name</label>
              <input
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-all"
                placeholder="e.g., Sony A7IV Rental"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-2 opacity-50">Cost ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-2 opacity-50">Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskExpenseCategory })}
                    className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="LOCATION">Location/Studio</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="CATERING">Catering</option>
                    <option value="TALENT">Talent/Model</option>
                  </select>
                  {/* Custom Arrow for select */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[8px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase ml-2 opacity-50">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-all min-h-[80px] resize-none"
                placeholder="Optional details (Vendor name, duration, etc...)"
              />
            </div>

            <button
              disabled={saving}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-[10px] uppercase py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              {saving ? "Registering Expense..." : "Commit Expense"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};