"use client";

import React, { useState } from "react";

export default function AddAssetModal({ isOpen, onClose, onRefresh, agencyId }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetName: "",
    category: "Camera",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        body: JSON.stringify({ ...formData, agencyId }),
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border-2 border-border w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Register Asset</h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Add Hardware to Inventory</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-black uppercase text-[10px]">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Asset Name</label>
            <input 
              required
              className="w-full bg-muted border-none rounded-xl p-4 text-sm font-bold uppercase tracking-tight focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. RED V-RAPTOR"
              onChange={(e) => setFormData({...formData, assetName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
              <select 
                className="w-full bg-muted border-none rounded-xl p-4 text-[10px] font-black uppercase outline-none"
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="Camera">Camera</option>
                <option value="Computing">Computing</option>
                <option value="Lighting">Lighting</option>
                <option value="Audio">Audio</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Price (USD)</label>
              <input 
                required
                type="number"
                className="w-full bg-muted border-none rounded-xl p-4 text-sm font-bold outline-none"
                placeholder="0.00"
                onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-foreground text-background py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? "Registering..." : "Confirm Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}