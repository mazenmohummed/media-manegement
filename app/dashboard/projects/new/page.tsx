"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// --- TYPES ---
interface Client {
  id: string;
  clientName: string;
  clientNo?: string;
}

interface RentalInput {
  id: string;
  name: string;
  cost: string;
}

interface TaskInput {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  employeeId?: string;
  assetIds: string[];
  grossRevenue: string; // Ensure this is editable in the UI
  margin: string;       // Ensure this is editable in the UI
  notes: string;
  rentals: RentalInput[];
}

const DEPARTMENTS = ["Consultation", "Video", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"];

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [dbEmployees, setDbEmployees] = useState<{ id: string, name: string }[]>([]);
  const [dbAssets, setDbAssets] = useState<{ id: string, assetName: string, category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectStory, setProjectStory] = useState("");
  const [cloudLink, setCloudLink] = useState(""); // Added cloudLink state
  const [selectedTasks, setSelectedTasks] = useState<Record<string, TaskInput>>({});

  // --- RENTAL HELPER FUNCTIONS ---
  const addRental = (dept: string) => {
    const newRental = { id: Date.now().toString(), name: "", cost: "0" };
    const currentRentals = selectedTasks[dept].rentals || [];
    updateTaskField(dept, "rentals", [...currentRentals, newRental]);
  };

  const removeRental = (dept: string, rentalId: string) => {
    const updatedRentals = selectedTasks[dept].rentals.filter(r => r.id !== rentalId);
    updateTaskField(dept, "rentals", updatedRentals);
  };

  const updateRentalField = (dept: string, rentalId: string, field: keyof RentalInput, value: string) => {
    const updatedRentals = selectedTasks[dept].rentals.map(r =>
      r.id === rentalId ? { ...r, [field]: value } : r
    );
    updateTaskField(dept, "rentals", updatedRentals);
  };

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.agencyId) return;

    async function loadData() {
      setLoading(true);
      const agencyId = session!.user.agencyId;

      try {
        const [clientRes, employeeRes, assetRes] = await Promise.all([
          fetch(`/api/clients?agencyId=${agencyId}`),
          fetch(`/api/employees?agencyId=${agencyId}`),
          fetch(`/api/assets?agencyId=${agencyId}`)
        ]);

        if (clientRes.ok) setClients(await clientRes.json());
        if (employeeRes.ok) setDbEmployees(await employeeRes.json());
        if (assetRes.ok) {
          const assetsData = await assetRes.json();
          setDbAssets(assetsData.assets || assetsData);
        }
      } catch (err) {
        console.error("Data Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [status, session]);

  const combineDateTime = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return null;
    const time = timeStr || "00:00";
    return new Date(`${dateStr}T${time}:00`);
  };

  const toggleTask = (dept: string) => {
    setSelectedTasks((prev) => {
      const next = { ...prev };
      if (next[dept]) {
        delete next[dept];
      } else {
        next[dept] = {
          startDate: "",
          endDate: "",
          startTime: "09:00",
          endTime: "18:00",
          employeeId: "",
          assetIds: [],
          grossRevenue: "0", // Initialized
          margin: "30",      // Initialized
          notes: "",
          rentals: []
        };
      }
      return next;
    });
  };

  const updateTaskField = (dept: string, field: keyof TaskInput, value: any) => {
    setSelectedTasks(prev => ({
      ...prev,
      [dept]: { ...prev[dept], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.agencyId) return alert("Session expired.");
    if (!clientId || !projectName) return alert("Missing required fields.");

    const formattedTasks = Object.entries(selectedTasks).map(([type, detail]) => ({
      taskType: type,
      startDate: combineDateTime(detail.startDate, detail.startTime),
      endDate: combineDateTime(detail.endDate, detail.endTime),
      grossRevenue: parseFloat(detail.grossRevenue) || 0,
      margin: parseFloat(detail.margin) || 0,
      description: detail.notes,
      assigneeId: detail.employeeId || null,
      assetIds: detail.assetIds,
      externalRentals: detail.rentals.map(r => ({
        itemName: r.name,
        cost: parseFloat(r.cost) || 0
      })),
      status: "PENDING"
    }));

    // Calculate totalValue for the Project model based on task revenues
    const totalValue = formattedTasks.reduce((acc, t) => acc + t.grossRevenue, 0);

    const payload = {
      projectName,
      clientId,
      projectStory,
      cloudLink,
      totalValue,
      status: "ACTIVE",
      // Prisma requires targetDeadline; using the furthest task end date or tomorrow
      targetDeadline: formattedTasks.length > 0 
        ? new Date(Math.max(...formattedTasks.map(t => t.endDate?.getTime() || 0)))
        : new Date(Date.now() + 86400000), 
      tasks: formattedTasks,
      agencyId: session.user.agencyId,
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) router.push("/dashboard/projects");
      else alert("Failed to save project.");
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase italic animate-pulse">Syncing Production Environment...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      <header>
        <h1 className="text-4xl font-black uppercase italic underline decoration-blue-600 decoration-4">New Project</h1>
        <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-2">Prisma Multi-Asset Production</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar - IDENTITY */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm sticky top-8">
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Identity & Cloud</label>
              <select
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-bold border-2 border-transparent focus:border-blue-600 transition-all"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="" disabled>SELECT CLIENT</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
              </select>
              <input placeholder="Project Name" className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all" value={projectName} onChange={e => setProjectName(e.target.value)} />
              
              {/* PROJECT STORY TEXTBOX */}
              <textarea 
                placeholder="Project Story / Brief..." 
                rows={4}
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all resize-none" 
                value={projectStory} 
                onChange={e => setProjectStory(e.target.value)} 
              />

              {/* Added Cloud Link Input */}
              <input 
                placeholder="Cloud Assets Link (Drive/Dropbox)" 
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all" 
                value={cloudLink} 
                onChange={e => setCloudLink(e.target.value)} 
              />
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-4 tracking-widest">Enable Departments</p>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map(dept => (
                  <button key={dept} type="button" onClick={() => toggleTask(dept)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTasks[dept] ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-muted text-muted-foreground"}`}>
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} className="w-full mt-8 bg-foreground text-background py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">
              Initialize Production
            </button>
          </div>
        </div>

        {/* Main Content Area - TASK CONFIG */}
        <div className="lg:col-span-8 space-y-6">
          {Object.entries(selectedTasks).map(([type, detail]) => (
            <div key={type} className="bg-card rounded-[2.5rem] border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="px-8 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-widest">{type} Configuration</span>
                {/* RENTAL TRIGGER */}
              <button 
                type="button" 
                onClick={() => addRental(type)}
                className="text-[10px] font-black text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-full border border-blue-600 transition-all"
              >
                + ADD EXTERNAL RENTAL
              </button>
              </div>

              <div className="p-8 space-y-6">
                
                {/* FINANCIALS & MARGINS (Added as requested) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Gross Revenue ($)</label>
                    <input 
                      type="number" 
                      className="w-full p-4 rounded-xl bg-blue-600/5 border border-blue-600/10 text-xs font-black outline-none" 
                      value={detail.grossRevenue} 
                      onChange={e => updateTaskField(type, "grossRevenue", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Target Margin (%)</label>
                    <input 
                      type="number" 
                      className="w-full p-4 rounded-xl bg-emerald-600/5 border border-emerald-600/10 text-xs font-black outline-none" 
                      value={detail.margin} 
                      onChange={e => updateTaskField(type, "margin", e.target.value)} 
                    />
                  </div>
                </div>

                {/* SPECIALIST & TIME */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase opacity-50">Assign Specialist</label>
                    <select
                      className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer"
                      value={detail.employeeId}
                      onChange={(e) => updateTaskField(type, "employeeId", e.target.value)}
                    >
                      <option value="">NO ASSIGNEE</option>
                      {dbEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-[9px] font-black uppercase opacity-50">Start Time</label>
                      <input type="time" className="w-full bg-transparent text-xs font-bold" value={detail.startTime} onChange={e => updateTaskField(type, "startTime", e.target.value)} />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-[9px] font-black uppercase opacity-50">End Time</label>
                      <input type="time" className="w-full bg-transparent text-xs font-bold" value={detail.endTime} onChange={e => updateTaskField(type, "endTime", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* INTERNAL ASSETS */}
                <div className="space-y-3 p-4 bg-purple-600/5 border border-purple-600/10 rounded-2xl">
                  <label className="text-[9px] font-black uppercase text-purple-600 tracking-widest">Internal Assets</label>
                  <div className="flex flex-wrap gap-2">
                    {dbAssets.map(asset => {
                      const isSelected = detail.assetIds.includes(asset.id);
                      return (
                        <button
                          key={asset.id} type="button"
                          onClick={() => {
                            const newIds = isSelected ? detail.assetIds.filter(id => id !== asset.id) : [...detail.assetIds, asset.id];
                            updateTaskField(type, "assetIds", newIds);
                          }}
                          className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all ${isSelected ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-white border-border text-muted-foreground"}`}
                        >
                          {asset.assetName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DATES */}
                <div className="grid grid-cols-2 gap-6 p-4 bg-muted/20 rounded-2xl border border-border">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black opacity-40 uppercase">Start Date</label>
                    <input type="date" className="w-full bg-transparent text-xs font-bold outline-none" value={detail.startDate} onChange={e => updateTaskField(type, "startDate", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black opacity-40 uppercase">End Date</label>
                    <input type="date" className="w-full bg-transparent text-xs font-bold outline-none" value={detail.endDate} onChange={e => updateTaskField(type, "endDate", e.target.value)} />
                  </div>
                </div>

                {/* EXTERNAL RENTALS SECTION */}
                {detail.rentals && detail.rentals.length > 0 && (
                <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">External Resource Rentals</p>
                  {detail.rentals.map(r => (
                    <div key={r.id} className="flex items-center gap-4 border-b border-amber-500/10 pb-2 group">
                      <input 
                        placeholder="Item Name" 
                        className="flex-1 bg-transparent text-xs font-bold outline-none" 
                        value={r.name} 
                        onChange={(e) => updateRentalField(type, r.id, "name", e.target.value)} 
                      />
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-border">
                        <span className="text-[10px] font-bold opacity-30">$</span>
                        <input 
                          placeholder="Cost" 
                          type="number"
                          className="w-16 bg-transparent text-xs font-black outline-none" 
                          value={r.cost} 
                          onChange={(e) => updateRentalField(type, r.id, "cost", e.target.value)} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeRental(type, r.id)} 
                        className="text-red-500 hover:scale-110 transition-transform px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  </div>
              )}

                <textarea placeholder="Notes..." className="w-full p-4 bg-muted/20 border border-border rounded-2xl text-sm min-h-[80px]" value={detail.notes} onChange={e => updateTaskField(type, "notes", e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}