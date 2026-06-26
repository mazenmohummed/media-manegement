"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProjectIdentitySidebar } from "@/components/main/projects/ProjectIdentitySidebar";
import { 
  TaskConfigCard, 
  TaskInput, 
  RentalInput, 
  TodoInput, 
  TaskEmployee 
} from "@/components/main/projects/TaskConfigCard";

interface Client {
  id: string;
  clientName: string;
  clientNo?: string;
}

function OSMLocationSearch({ onSearch, defaultValue }: { onSearch: (val: string) => void, defaultValue?: string }) {
  const [val, setVal] = useState(defaultValue || "");
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Search location (e.g. Selena Bay)..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(val); } }}
        className="flex-1 bg-transparent text-xs font-bold outline-none border-b border-emerald-600/20 pb-1"
      />
      <button type="button" onClick={() => onSearch(val)} className="text-[9px] bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors">
        SEARCH
      </button>
    </div>
  );
}

const DEPARTMENTS = ["Consultation", "Video", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"];

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [dbEmployees, setDbEmployees] = useState<{ id: string; name: string; userType: string; role: string; verifiedSkills: string[]; }[]>([]);
  const [dbAssets, setDbAssets] = useState<{ id: string; assetName: string; category: string; availabilityStatus: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectStory, setProjectStory] = useState("");
  const [cloudLink, setCloudLink] = useState(""); 
  const [selectedTasks, setSelectedTasks] = useState<Record<string, TaskInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, { employees: string[], assets: string[] }>>({});

  const validateAvailability = async (dept: string, task: TaskInput) => {
    if (!task.startDate || !task.endDate) return;
    try {
      const res = await fetch("/api/projects/validate-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: combineDateTime(task.startDate, task.startTime),
          endDate: combineDateTime(task.endDate, task.endTime),
          employeeIds: task.employeeIds.map(e => e.id),
          assetIds: task.assetIds
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConflicts(prev => ({ ...prev, [dept]: data }));
      }
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  const addRental = (dept: string) => {
    const newRental: RentalInput = { id: Date.now().toString(), name: "", cost: "0", category: "EQUIPMENT", description: "", status: "PENDING" };
    const currentRentals = selectedTasks[dept].rentals || [];
    updateTaskField(dept, "rentals", [...currentRentals, newRental]);
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
          employeeIds: [],
          assetIds: [],
          grossRevenue: "0",
          margin: "30",
          notes: "",
          rentals: [],
          todos: [],
          // ── compensation defaults ──
          isOutOfWorkingHours: false,
          compensationStrategy: "NONE",
          compensationAmount: "",
          deductionStrategy: "NONE",
        };
      }
      return next;
    });
  };

  const updateTaskField = (dept: string, field: keyof TaskInput, value: any) => {
    setSelectedTasks(prev => {
      const updatedTask = { ...prev[dept], [field]: value };
      if (["startDate", "endDate", "employeeIds", "assetIds"].includes(field)) {
        validateAvailability(dept, updatedTask);
      }
      return { ...prev, [dept]: updatedTask };
    });
  };

  const removeRental = (dept: string, rentalId: string) => {
    const updatedRentals = selectedTasks[dept].rentals.filter(r => r.id !== rentalId);
    updateTaskField(dept, "rentals", updatedRentals);
  };

  const updateRentalField = (dept: string, rentalId: string, field: keyof RentalInput, value: string) => {
    const updatedRentals = selectedTasks[dept].rentals.map(r => r.id === rentalId ? { ...r, [field]: value } : r);
    updateTaskField(dept, "rentals", updatedRentals);
  };

  useEffect(() => {
    Object.entries(selectedTasks).forEach(([dept, task]) => {
      if (task.startDate && task.endDate) validateAvailability(dept, task);
    });
  }, [selectedTasks]);

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
        if (clientRes.ok) { const data = await clientRes.json(); setClients(Array.isArray(data) ? data : data.clients || []); }
        if (employeeRes.ok) { const data = await employeeRes.json(); setDbEmployees(Array.isArray(data) ? data : data.employees || []); }
        if (assetRes.ok) { const data = await assetRes.json(); setDbAssets(Array.isArray(data) ? data : data.assets || []); }
      } catch (err) {
        console.error("Data Fetch Error:", err);
        setDbEmployees([]); setClients([]); setDbAssets([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [status, session]);

  const combineDateTime = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return null;
    const time = timeStr || "00:00";
    const dt = new Date(`${dateStr}T${time}:00`);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  const handleUseCurrentLocation = (type: string) => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser.");
    updateTaskField(type, "isSearching", true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedTasks(prev => ({
          ...prev,
          [type]: { ...prev[type], latitude, longitude, locationName: `Manual GPS Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, isSearching: false }
        }));
      },
      (err) => { console.error(err); updateTaskField(type, "isSearching", false); alert("Unable to retrieve your location."); },
      { enableHighAccuracy: true }
    );
  };

  const handleSearch = async (query: string, type: string) => {
    if (!query || query.length < 3) return;
    updateTaskField(type, "isSearching", true);
    const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
    if (coordRegex.test(query.trim())) {
      const [lat, lon] = query.trim().split(',').map(n => parseFloat(n.trim()));
      setSelectedTasks(prev => ({ ...prev, [type]: { ...prev[type], latitude: lat, longitude: lon, locationName: `📍 Exact Pin: ${lat}, ${lon}`, isSearching: false } }));
      return;
    }
    const plusCodeRegex = /[A-Z0-9]{4,}\+[A-Z0-9]{2,}/g;
    let cleanQuery = query.replace(plusCodeRegex, "").trim().replace(/(after|beside|behind|امام|بجوار|خلف|بعد)/gi, "").replace(/[،,]/g, " ").trim();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=eg&limit=1&addressdetails=1&accept-language=ar,en`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setSelectedTasks(prev => ({ ...prev, [type]: { ...prev[type], latitude: parseFloat(lat), longitude: parseFloat(lon), locationName: display_name, isSearching: false } }));
      } else {
        updateTaskField(type, "isSearching", false);
      }
    } catch (err) {
      console.error("Search Error:", err); updateTaskField(type, "isSearching", false);
    }
  };

  const updateTodoDescription = (dept: string, todoId: string, description: string) => {
    const updatedTodos = selectedTasks[dept].todos.map(t => t.id === todoId ? { ...t, description } : t);
    updateTaskField(dept, "todos", updatedTodos);
  };

  const addTodo = (dept: string) => {
    const newTodo = { id: Date.now().toString(), text: "" };
    updateTaskField(dept, "todos", [...(selectedTasks[dept].todos || []), newTodo]);
  };

  const removeTodo = (dept: string, todoId: string) => {
    updateTaskField(dept, "todos", selectedTasks[dept].todos.filter(t => t.id !== todoId));
  };

  const updateTodoText = (dept: string, todoId: string, text: string) => {
    updateTaskField(dept, "todos", selectedTasks[dept].todos.map(t => t.id === todoId ? { ...t, text } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.agencyId) return alert("Session expired.");
    if (!clientId || !projectName) return alert("Missing required fields.");

    const hasConflicts = Object.values(conflicts).some(c => c.employees.length > 0 || c.assets.length > 0);
    if (hasConflicts) return alert("Cannot initialize production: scheduling conflicts detected. Please resolve them first.");

    setIsSubmitting(true);

    const formattedTasks = Object.entries(selectedTasks).map(([type, detail]) => ({
      taskType: type,
      startDate: combineDateTime(detail.startDate, detail.startTime),
      endDate:   combineDateTime(detail.endDate,   detail.endTime),

      // ── Financials ────────────────────────────────────────────────────────
      internalCost: parseFloat(detail.grossRevenue) || 0,
      grossRevenue: detail.grossRevenue, // send both so API fallback always resolves
      margin:       parseFloat(detail.margin) || 0,
      description:  detail.notes,

      // ── Team & assets ─────────────────────────────────────────────────────
      employeeIds: detail.employeeIds, // [{ id, salary }] — API reads this for freelancer pay
      assigneeIds: detail.employeeIds, // duplicate key the API also checks
      assetIds:    detail.assetIds,

      // ── Location ──────────────────────────────────────────────────────────
      latitude:     detail.latitude     ?? null,
      longitude:    detail.longitude    ?? null,
      locationName: detail.locationName ?? null,
      radius: 200,

      // ── Out-of-hours compensation — THE FIELDS THAT WERE MISSING ─────────
      isOutOfWorkingHours:  detail.isOutOfWorkingHours  ?? false,
      compensationStrategy: detail.compensationStrategy ?? "NONE",
      compensationAmount:   detail.compensationAmount   ?? "0",
      deductionStrategy:    detail.deductionStrategy    ?? "NONE",

      // ── Expenses & todos ──────────────────────────────────────────────────
      rentals: detail.rentals.map(r => ({
        id:          r.id,
        name:        r.name,
        itemName:    r.name,
        cost:        r.cost,
        category:    r.category,
        description: r.description,
      })),
      todos: (detail.todos || []).map((t, index) => ({
        text:        t.text,
        description: t.description || "",
        order:       index,
        agencyId:    session!.user.agencyId,
        priority:    "MEDIUM",
      })),

      status: "PENDING",
    }));

    const payload = { projectName, clientId, projectStory, cloudLink, tasks: formattedTasks };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/dashboard/projects");
      } else {
        const errData = await response.json();
        alert(`Failed to save: ${errData.error}`);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitting(false);
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
        <ProjectIdentitySidebar 
          clients={clients}
          clientId={clientId}
          setClientId={setClientId}
          projectName={projectName}
          setProjectName={setProjectName}
          projectStory={projectStory}
          setProjectStory={setProjectStory}
          cloudLink={cloudLink}
          setCloudLink={setCloudLink}
          departments={DEPARTMENTS}
          selectedTasks={selectedTasks}
          toggleTask={toggleTask}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <div className="lg:col-span-8 space-y-6">
          {Object.entries(selectedTasks).map(([type, detail]) => (
            <TaskConfigCard
              key={type}
              type={type}
              detail={detail}
              dbEmployees={dbEmployees}
              dbAssets={dbAssets}
              conflicts={conflicts[type]} 
              updateTaskField={updateTaskField}
              addRental={addRental}
              removeRental={removeRental}
              updateRentalField={updateRentalField}
              addTodo={addTodo}
              removeTodo={removeTodo}
              updateTodoText={updateTodoText}
              updateTodoDescription={updateTodoDescription}
              handleUseCurrentLocation={handleUseCurrentLocation}
              handleSearch={handleSearch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}