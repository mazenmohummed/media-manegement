"use client";

import Link from "next/link";
import React, { useState, useMemo } from "react";

// --- CONSTANTS & TYPES ---
const SERVICE_TYPES = [
  "Consultation", "Video", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"
];

const EQUIPMENT_CATALOG = [
  { id: "cam-01", name: "4K Cinema Rig", category: "Video" },
  { id: "drn-01", name: "DJI Mavic 3 Pro", category: "Video" },
  { id: "aud-01", name: "Lavalier Wireless Kit", category: "Audio" },
  { id: "lgt-01", name: "Aputure 600d Pro", category: "Lighting" },
  { id: "sft-01", name: "Adobe Creative Cloud", category: "Software" },
  { id: "st-01", name: "Podcasting Studio A", category: "Space" },
];

type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

interface RentalItem {
  id: string;
  name: string;
  cost: string;
}

interface ServiceDetail {
  employee: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  grossRevenue: string;
  margin: string;
  notes: string;
  story: string; 
  equipment: string[];
  rentals: RentalItem[];
}

interface Project {
  id: number;
  projectName: string;
  clientName: string;
  projectStory: string;
  driveLink: string;
  services: Record<string, ServiceDetail>;
}

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectStory, setProjectStory] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [selectedServices, setSelectedServices] = useState<Record<string, ServiceDetail>>({});
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // --- LOGIC: CALCULATIONS ---
  const calculateProjectProfit = (services: Record<string, ServiceDetail>) => {
    return Object.values(services).reduce((sum, s) => {
      const rev = Number(s.grossRevenue) || 0;
      const marg = Number(s.margin) || 0;
      const rentalCosts = s.rentals.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
      return sum + (rev * (marg / 100)) - rentalCosts;
    }, 0);
  };

  const calculateTotalRevenue = (services: Record<string, ServiceDetail>) => {
    return Object.values(services).reduce((sum, s) => sum + (Number(s.grossRevenue) || 0), 0);
  };

  // --- LOGIC: FILTER ENGINE ---
  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) => {
      const searchStr = `${project.projectName} ${project.clientName}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesCat = filterCats.length === 0 || 
        Object.keys(project.services).some(s => filterCats.includes(s));

      const serviceDates = Object.values(project.services)
        .filter(s => s.startDate)
        .map(s => new Date(s.startDate).getTime());
      
      if (serviceDates.length === 0) return matchesSearch && matchesCat;

      const projectDate = new Date(Math.min(...serviceDates));
      let matchesTime = true;

      if (filterMode === "PRESET") {
        if (activePreset === "ALL") matchesTime = true;
        else if (activePreset === "Q1") matchesTime = projectDate.getMonth() <= 2;
        else if (activePreset === "Q2") matchesTime = projectDate.getMonth() >= 3 && projectDate.getMonth() <= 5;
      } else if (filterMode === "MONTH") {
        matchesTime = projectDate.getMonth() === parseInt(selectedMonth);
      } else if (filterMode === "CUSTOM") {
        const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
        const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
        matchesTime = projectDate.getTime() >= start && projectDate.getTime() <= end;
      }

      return matchesSearch && matchesCat && matchesTime;
    });
  }, [projectsList, searchQuery, filterCats, filterMode, activePreset, selectedMonth, dateRange]);

  // --- HANDLERS ---
  const toggleService = (service: string) => {
    setSelectedServices((prev) => {
      const newServices = { ...prev };
      if (newServices[service]) {
        delete newServices[service];
      } else {
        newServices[service] = { 
          employee: [""], startDate: "", endDate: "", startTime: "09:00", 
          endTime: "18:00", grossRevenue: "", margin: "30", notes: "",
          story: "", equipment: [], rentals: []
        };
      }
      return newServices;
    });
  };

  const updateServiceDetail = (service: string, field: keyof ServiceDetail, value: any) => {
    setSelectedServices(prev => ({ ...prev, [service]: { ...prev[service], [field]: value } }));
  };

  const toggleEquipment = (service: string, equipId: string) => {
    const currentEquip = selectedServices[service].equipment;
    const nextEquip = currentEquip.includes(equipId)
      ? currentEquip.filter(id => id !== equipId)
      : [...currentEquip, equipId];
    updateServiceDetail(service, "equipment", nextEquip);
  };

  const addRental = (service: string) => {
    const newRental = { id: Date.now().toString(), name: "", cost: "" };
    updateServiceDetail(service, "rentals", [...selectedServices[service].rentals, newRental]);
  };

  const updateRental = (service: string, rentalId: string, field: keyof RentalItem, value: string) => {
    const updatedRentals = selectedServices[service].rentals.map(r => 
      r.id === rentalId ? { ...r, [field]: value } : r
    );
    updateServiceDetail(service, "rentals", updatedRentals);
  };

  const removeRental = (service: string, rentalId: string) => {
    const updatedRentals = selectedServices[service].rentals.filter(r => r.id !== rentalId);
    updateServiceDetail(service, "rentals", updatedRentals);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(selectedServices).length === 0) return alert("Select at least one service.");
    const newProject: Project = { id: Date.now(), projectName, driveLink, projectStory, clientName, services: { ...selectedServices } };
    setProjectsList([newProject, ...projectsList]);
    setProjectName(""); setClientName(""); setProjectStory(""); setDriveLink(""); setSelectedServices({});
  };

  const addStaff = (service: string) => {
  const currentStaff = selectedServices[service].employee;
  updateServiceDetail(service, "employee", [...currentStaff, ""]);
};

const updateStaffMember = (service: string, index: number, value: string) => {
  const updatedStaff = [...selectedServices[service].employee];
  updatedStaff[index] = value;
  updateServiceDetail(service, "employee", updatedStaff);
};

const removeStaffMember = (service: string, index: number) => {
  const currentStaff = selectedServices[service].employee;
  if (currentStaff.length <= 1) return; // Keep at least one input
  const updatedStaff = currentStaff.filter((_, i) => i !== index);
  updateServiceDetail(service, "employee", updatedStaff);
};

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen text-foreground space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase italic underline decoration-blue-600 decoration-4">Campaign Deployment</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Resource & Revenue Allocation</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR */}
        <div className="lg:col-span-4">
          <form onSubmit={handleSubmit} className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm sticky top-8 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">General Info</label>
              <input placeholder="Project Name" className="w-full p-4 rounded-2xl bg-muted/50 border-none text-sm outline-none focus:ring-2 ring-blue-500/20" value={projectName} onChange={e => setProjectName(e.target.value)} required />
              <input placeholder="Client Name" className="w-full p-4 rounded-2xl bg-muted/50 border-none text-sm outline-none focus:ring-2 ring-blue-500/20" value={clientName} onChange={e => setClientName(e.target.value)} required />
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest">Service Departments</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => toggleService(s)} 
                    className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedServices[s] ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-card text-muted-foreground border-border hover:border-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* New Story Box */}
              <textarea 
                placeholder="Project Story / Brief..." 
                className="w-full p-4 rounded-2xl bg-muted/50 border-none text-sm outline-none focus:ring-2 ring-blue-500/20 min-h-[100px] resize-none" 
                value={projectStory} 
                onChange={e => setProjectStory(e.target.value)} 
              />

              <input 
                placeholder="OneDrive / Google Drive Link" 
                type="url"
                className="w-full p-4 rounded-2xl bg-muted/50 border-none text-sm outline-none focus:ring-2 ring-emerald-500/20 border-l-4 border-emerald-500/10" 
                value={driveLink} 
                onChange={e => setDriveLink(e.target.value)} 
              />

            <button type="submit" className="w-full bg-foreground text-background py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-[0.98]">Deploy Work Orders</button>
          </form>
        </div>

        {/* MAIN: SERVICE DETAILS */}
        <div className="lg:col-span-8 space-y-6">
          {Object.entries(selectedServices).map(([name, detail]) => (
            <div key={name} className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="px-8 py-5 bg-muted/30 border-b border-border flex justify-between items-center">
                <span className="text-[11px] font-black uppercase text-foreground tracking-[0.2em]">{name} Dept</span>
                <button type="button" onClick={() => addRental(name)} className="text-[9px] font-black text-blue-600 hover:underline uppercase">+ Add External Rental</button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assignees</label>
                        <button 
                          type="button" 
                          onClick={() => addStaff(name)} 
                          className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                        >
                          + Add Staff
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {detail.employee.map((staff, idx) => (
                          <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-left-1">
                            <input 
                              className="flex-1 p-2 border-b border-border bg-transparent text-sm font-bold uppercase outline-none focus:border-blue-500 transition-colors" 
                              placeholder="Staff Name" 
                              value={staff} 
                              onChange={e => updateStaffMember(name, idx, e.target.value)} 
                            />
                            {detail.employee.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeStaffMember(name, idx)} 
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <span className="text-xs">✕</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gross Revenue ($)</label>
                    <input type="number" className="w-full p-2 border-b border-blue-500/30 bg-blue-500/5 text-sm font-mono font-black outline-none" placeholder="0.00" value={detail.grossRevenue} onChange={e => updateServiceDetail(name, "grossRevenue", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Margin (%)</label>
                    <input type="number" className="w-full p-2 border-b border-emerald-500/30 bg-emerald-500/5 text-sm font-mono font-black outline-none" placeholder="30" value={detail.margin} onChange={e => updateServiceDetail(name, "margin", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Equipment Allocation</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {EQUIPMENT_CATALOG.map((item) => (
                      <button key={item.id} type="button" onClick={() => toggleEquipment(name, item.id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${detail.equipment.includes(item.id) ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border bg-muted/20 hover:border-muted-foreground"}`}>
                        <span className={`text-[9px] font-black uppercase ${detail.equipment.includes(item.id) ? "text-blue-600" : "text-muted-foreground"}`}>{item.category}</span>
                        <span className="text-[11px] font-bold text-foreground leading-tight">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {detail.rentals.length > 0 && (
                  <div className="space-y-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl">
                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">External Rentals (Cost Deducted from Profit)</label>
                    {detail.rentals.map((rental) => (
                      <div key={rental.id} className="flex gap-4 items-end animate-in slide-in-from-left-2">
                        <input placeholder="Rental Item" className="flex-1 bg-transparent border-b border-amber-500/30 p-1 text-sm outline-none" value={rental.name} onChange={e => updateRental(name, rental.id, "name", e.target.value)} />
                        <input type="number" placeholder="Cost $" className="w-32 bg-transparent border-b border-amber-500/30 p-1 text-sm font-mono outline-none" value={rental.cost} onChange={e => updateRental(name, rental.id, "cost", e.target.value)} />
                        <button type="button" onClick={() => removeRental(name, rental.id)} className="text-amber-600 hover:text-red-500 pb-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-muted/20 border border-border rounded-3xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Deployment Start</label>
                    <div className="flex gap-2">
                      <input type="date" className="flex-1 p-3 rounded-xl border border-border bg-background text-[11px] font-bold uppercase" value={detail.startDate} onChange={e => updateServiceDetail(name, "startDate", e.target.value)} />
                      <input type="time" className="p-3 rounded-xl border border-border bg-background text-[11px] font-bold uppercase" value={detail.startTime} onChange={e => updateServiceDetail(name, "startTime", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Project Conclusion</label>
                    <div className="flex gap-2">
                      <input type="date" className="flex-1 p-3 rounded-xl border border-border bg-background text-[11px] font-bold uppercase" value={detail.endDate} onChange={e => updateServiceDetail(name, "endDate", e.target.value)} />
                      <input type="time" className="p-3 rounded-xl border border-border bg-background text-[11px] font-bold uppercase" value={detail.endTime} onChange={e => updateServiceDetail(name, "endTime", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Scope & Deliverables
                  </label>
                  <textarea 
                    className="w-full p-4 bg-muted/20 border border-border rounded-3xl text-sm min-h-[100px] outline-none focus:ring-2 ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/50" 
                    placeholder={`Describe the specific ${name} requirements, scene counts, or final file formats...`}
                    value={detail.notes} 
                    onChange={e => updateServiceDetail(name, "notes", e.target.value)} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- FILTER ENGINE SECTION --- */}
      <div className="space-y-6">
        <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 flex-1 w-full">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Ledger Search</h2>
              <input type="text" placeholder="SEARCH PROJECTS OR CLIENTS..." className="w-full bg-muted/50 border border-border p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-blue-500/20 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filter Mode</h2>
              <div className="flex bg-muted p-1 rounded-xl border border-border w-fit">
                {(["PRESET", "MONTH", "CUSTOM"] as FilterMode[]).map((mode) => (
                  <button key={mode} onClick={() => setFilterMode(mode)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
            <div className="space-y-4">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Departmental Filter</h2>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPES.map(cat => (
                  <button key={cat} onClick={() => setFilterCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${filterCats.includes(cat) ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground hover:border-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Timeline Selection</h2>
              <div className="flex flex-wrap items-center gap-4">
                {filterMode === "PRESET" && (
                  <select value={activePreset} onChange={(e) => setActivePreset(e.target.value)}
                    className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer">
                    <option value="ALL">All Recorded Time</option>
                    <option value="Q1">Q1 (Jan — Mar)</option>
                    <option value="Q2">Q2 (Apr — Jun)</option>
                  </select>
                )}
                {filterMode === "MONTH" && (
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-background border border-border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                )}
                {filterMode === "CUSTOM" && (
                  <div className="flex items-center gap-3">
                    <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                    <span className="text-muted-foreground text-[10px] font-black">TO</span>
                    <input type="date" className="bg-background border border-border px-3 py-2 rounded-xl text-[10px] uppercase font-bold outline-none" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER TABLE: LEDGER */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <Link href="/projects/track">
        <div className="p-8 border-b border-border bg-foreground text-background flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">Production Ledger</h2>
          <div className="text-right">
             <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Filtered Projects</p>
             <p className="text-sm font-black font-mono">{filteredProjects.length} / {projectsList.length}</p>
          </div>
        </div>
        </Link>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                <th className="p-6">Project / Client</th>
                <th className="p-6">Departmental Breakdown</th>
                <th className="p-6 text-right">Net Profit (Est.)</th>
                <th className="p-6 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map(p => (
                <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="p-6 align-top">
                    <p className="font-black text-foreground uppercase tracking-tight text-sm">{p.projectName}</p>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">{p.clientName}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(p.services).map(s => (
                        <span key={s} className="px-2 py-1 bg-muted border border-border text-foreground text-[8px] font-black uppercase rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-right align-top font-mono font-black text-emerald-500">
                    +${calculateProjectProfit(p.services).toLocaleString()}
                  </td>
                  <td className="p-6 text-right align-top font-mono font-black text-foreground text-lg">
                    ${calculateTotalRevenue(p.services).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="p-20 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">
              Zero Ledger Entries Match Filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}