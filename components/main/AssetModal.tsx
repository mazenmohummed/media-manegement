"use client";

import React, { useState, useEffect } from "react";

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  agencyId: string;
  initialData?: any; // If present, we are in EDIT mode
}

export default function AssetModal({ isOpen, onClose, onRefresh, agencyId, initialData }: AssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetName: "",
    category: "Camera",
    purchasePrice: "",
    currentValue: "",
    availabilityStatus: "Available",
  });

  // Sync form with initialData when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        assetName: initialData.assetName || "",
        category: initialData.category || "Camera",
        purchasePrice: initialData.purchasePrice || "",
        currentValue: initialData.currentValue || "",
        availabilityStatus: initialData.availabilityStatus || "Available",
      });
    } else {
      setFormData({
        assetName: "",
        category: "Camera",
        purchasePrice: "",
        currentValue: "",
        availabilityStatus: "Available",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = initialData ? `/api/assets/${initialData.id}` : "/api/assets";
    const method = initialData ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, agencyId }),
      });

      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <div className="bg-card border-2 border-border w-full max-w-xl rounded-[3rem] p-12 shadow-2xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">
              {initialData ? "Update Asset" : "Register Asset"}
            </h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">
              {initialData ? `Modifying ${initialData.assetNo}` : "Global Hardware Registry"}
            </p>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform p-2">
            <span className="font-black text-sm">✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Asset Identity</label>
            <input 
              required
              value={formData.assetName}
              className="w-full bg-muted rounded-2xl p-5 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. SONY FX6"
              onChange={(e) => setFormData({...formData, assetName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Category</label>
              <select 
                value={formData.category}
                className="w-full bg-muted rounded-2xl p-5 text-[10px] font-black uppercase outline-none"
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {["Camera", "Computing", "Lighting", "Audio", "Other"].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Status</label>
              <select 
                value={formData.availabilityStatus}
                className="w-full bg-muted rounded-2xl p-5 text-[10px] font-black uppercase outline-none"
                onChange={(e) => setFormData({...formData, availabilityStatus: e.target.value})}
              >
                <option value="Available">Available</option>
                <option value="On Set">On Set</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Current Valuation (USD)</label>
            <input 
              required
              type="number"
              value={formData.currentValue}
              className="w-full bg-muted rounded-2xl p-5 text-sm font-mono font-bold outline-none"
              placeholder="0.00"
              onChange={(e) => setFormData({...formData, currentValue: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-foreground text-background py-6 rounded-3xl font-black uppercase tracking-[0.4em] text-[11px] hover:scale-[0.98] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : initialData ? "Save Changes" : "Confirm Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}