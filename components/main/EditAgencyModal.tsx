"use client";

import React, { useState, useEffect } from "react";
import { X, Save, MapPin, CreditCard, Building2, Navigation, Mail, Clock } from "lucide-react";

// Default structure for a week
const DEFAULT_HOURS = [
  { day: "Monday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Tuesday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Wednesday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Thursday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Friday", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { day: "Saturday", openTime: "09:00", closeTime: "17:00", isClosed: true },
  { day: "Sunday", openTime: "09:00", closeTime: "17:00", isClosed: true },
];

export default function EditAgencyModal({ agency, isOpen, onClose, onRefresh }: any) {
  const [formData, setFormData] = useState({
    agencyName: "",
    email: "",
    address: "",
    latitude: 0,
    longitude: 0,
    radius: 100,
    plan: "FREE",
    workingHours: DEFAULT_HOURS, // New State Field
  });

  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (agency) {
      setFormData({
        agencyName: agency.agencyName || "",
        email: agency.email || "",
        address: agency.address || "", // Corrected mapping from prompt
        latitude: agency.latitude || 0,
        longitude: agency.longitude || 0,
        radius: agency.radius || 100,
        plan: agency.subscription?.plan || "FREE",
        // Use existing workingHours or fallback to default
        workingHours: agency.workingHours?.length > 0 ? agency.workingHours : DEFAULT_HOURS,
      });
    }
  }, [agency]);

  // Handler to update specific day in the array
  const handleHourChange = (index: number, field: string, value: any) => {
    const updatedHours = [...formData.workingHours];
    updatedHours[index] = { ...updatedHours[index], [field]: value };
    setFormData({ ...formData, workingHours: updatedHours });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsSearching(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setIsSearching(false);
        },
        (error) => {
          console.error("Location access denied", error);
          setIsSearching(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setIsSearching(false);
    }
  };

  const handleSearchAddress = async () => {
  if (!formData.address) return alert("Enter an address first.");
  
  setIsGeocoding(true);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`
    );
    const data = await res.json();
    
    if (data && data.length > 0) {
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      }));
    } else {
      alert("Location not found. Try adding 'Hurghada' or 'Egypt' to the search.");
    }
  } catch (err) {
    console.error("Geocoding error:", err);
  } finally {
    setIsGeocoding(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card h-full shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-300 border-l border-border/50">
        
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Agency Settings</h2>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Configure Terminal Node</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X/></button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pb-32 pr-2">
          
          {/* IDENTITY SECTION */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <Building2 size={12}/> Business Identity
            </h4>
            <input 
              value={formData.agencyName}
              onChange={(e) => setFormData({...formData, agencyName: e.target.value})}
              placeholder="Agency Name"
              className="w-full bg-muted/30 border border-border p-4 rounded-2xl font-bold text-sm outline-none focus:border-primary/50 transition-colors"
            />
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="agency@domain.com"
              className="w-full bg-muted/30 border border-border p-4 rounded-2xl font-bold text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* WORKING HOURS SECTION */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <Clock size={12}/> Shift Operations (Working Hours)
            </h4>
            <div className="space-y-2">
              {formData.workingHours.map((wh, index) => (
                <div key={wh.day} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-black uppercase w-20">{wh.day}</span>
                  
                  {!wh.isClosed ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input 
                        type="time" 
                        value={wh.openTime} 
                        onChange={(e) => handleHourChange(index, "openTime", e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-[10px] font-bold"
                      />
                      <span className="text-[10px] opacity-40">TO</span>
                      <input 
                        type="time" 
                        value={wh.closeTime} 
                        onChange={(e) => handleHourChange(index, "closeTime", e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-[10px] font-bold"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 text-[10px] font-black text-rose-500 italic opacity-60">OFFICE CLOSED</div>
                  )}

                  <button 
                    onClick={() => handleHourChange(index, "isClosed", !wh.isClosed)}
                    className={`text-[8px] font-black px-2 py-1 rounded uppercase transition-colors ${wh.isClosed ? 'bg-rose-500 text-white' : 'bg-primary/10 text-primary'}`}
                  >
                    {wh.isClosed ? "Open" : "Close"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
            {/* SECTION: EGYPT PRODUCTION LOCATION & GEOFENCING */}
<div className="space-y-4 p-5 bg-emerald-600/5 border border-emerald-600/10 rounded-[2rem]">
  <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
    <MapPin size={12}/> Egypt Production Location
  </h4>
  
  <div className="flex gap-2 items-center bg-white p-2 rounded-2xl shadow-sm border border-emerald-600/10">
    {/* GPS Button */}
    <button 
      type="button"
      onClick={handleUseCurrentLocation} 
      className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
      title="Use My GPS"
    >
      <Navigation size={16} className={isSearching ? "animate-spin" : ""} />
    </button>

    <input
      type="text"
      value={formData.address}
      onChange={(e) => setFormData({...formData, address: e.target.value})}
      onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
      placeholder="Search Area (e.g. Selena Bay)..."
      className="flex-1 bg-transparent text-xs font-bold outline-none  bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white px-2"
    />

    {/* NEW SEARCH BUTTON */}
    <button 
      type="button"
      onClick={handleSearchAddress}
      disabled={isGeocoding}
      className="px-4 h-10 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
    >
      {isGeocoding ? "SCANNING..." : "RESOLVE"}
    </button>
  </div>

  <div className="grid grid-cols-2 gap-4 text-[10px] font-mono opacity-70">
    <div className="bg-white/50 p-2 rounded-lg border border-emerald-600/5 flex justify-between">
      <span className="opacity-40">LAT</span> {formData.latitude.toFixed(6)}
    </div>
    <div className="bg-white/50 p-2 rounded-lg border border-emerald-600/5 flex justify-between">
      <span className="opacity-40">LNG</span> {formData.longitude.toFixed(6)}
    </div>
  </div>
  </div>
          {/* SECTION: PLAN */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <CreditCard size={12}/> Subscription Plan
            </h4>
            <select 
              value={formData.plan}
              onChange={(e) => setFormData({...formData, plan: e.target.value})}
              className="w-full bg-foreground text-background p-4 rounded-2xl font-black uppercase italic text-sm outline-none cursor-pointer"
            >
              <option value="FREE">Free Trial</option>
              <option value="PRO">Pro Monthly</option>
              <option value="UNLIMITED">Unlimited Studio</option>
            </select>
          </div>
        </div>

      

        {/* FOOTER */}
        <div className="flex bottom-4 left-4 right-4">
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full bg-primary text-primary-foreground py-6 rounded-3xl font-black uppercase italic text-lg shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
          >
            {saving ? <span className="animate-pulse">DEPLOYING...</span> : <><Save size={20}/> Deploy Changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}