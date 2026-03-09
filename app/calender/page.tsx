"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, setMonth, startOfMonth } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Calendar as CalendarIcon, Briefcase, Users, Filter as FilterIcon } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

// --- TYPES ---
type CalendarMode = "TASKS" | "AVAILABILITY";
type FilterMode = "PRESET" | "MONTH" | "CUSTOM";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function UnifiedCalendarPage() {
  // 1. STATE
  const [viewMode, setViewMode] = useState<CalendarMode>("TASKS");
  const [filterMode, setFilterMode] = useState<FilterMode>("PRESET");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  
  const [activePreset, setActivePreset] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // 2. MOCK DATA
  const taskEvents = [
    { title: "Nike Winter Shoot", start: new Date(2026, 2, 10, 10, 0), end: new Date(2026, 2, 10, 15, 0), resource: { status: "Completed" } },
    { title: "TechCorp App UI", start: new Date(2026, 2, 12, 9, 0), end: new Date(2026, 2, 14, 18, 0), resource: { status: "In-Progress" } },
  ];

  const availabilityEvents = [
    { title: "Ahmed Hassan (Vacation)", start: new Date(2026, 2, 15), end: new Date(2026, 2, 20), resource: { type: "vacation" } },
    { title: "Sara Jones (Sick)", start: new Date(2026, 2, 5), end: new Date(2026, 2, 6), resource: { type: "sick" } },
  ];

  const activeEvents = viewMode === "TASKS" ? taskEvents : availabilityEvents;

  // 3. THEME-AWARE EVENT STYLING
  const eventPropGetter = (event: any) => {
    let backgroundColor = "hsl(var(--primary))"; 

    if (viewMode === "TASKS") {
      backgroundColor = event.resource.status === "Completed" ? "#10b981" : "#2563eb";
    } else {
      backgroundColor = event.resource.type === "vacation" ? "#f97316" : "#ef4444";
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        border: "none",
        fontSize: "11px",
        fontWeight: "800",
        padding: "4px 8px",
        color: "white",
      },
    };
  };



  return (
    <div className="space-y-8 p-2 text-foreground">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Central Schedule</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {viewMode === "TASKS" ? "Operational Pipeline" : "Team Availability Matrix"}
            </p>
          </div>
        </div>

        {/* MODE TOGGLE */}
        <div className="flex bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
          <button
            onClick={() => setViewMode("TASKS")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "TASKS" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase size={14} /> Tasks
          </button>
          <button
            onClick={() => setViewMode("AVAILABILITY")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "AVAILABILITY" ? "bg-background text-orange-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users size={14} /> Availability
          </button>
        </div>
      </header>

 

      {/* CALENDAR SECTION */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
            <FilterIcon className="w-3 h-3" /> 
            {viewMode === "TASKS" ? "Task Deadlines & Milestones" : "Team Leave Ledger"}
          </h2>
          
          <div className="flex gap-4 text-[9px] font-black uppercase tracking-tighter">
            {viewMode === "TASKS" ? (
              <>
                <span className="flex items-center gap-1.5 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Done</span>
                <span className="flex items-center gap-1.5 text-blue-500"><span className="w-2 h-2 rounded-full bg-blue-500" /> Active</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-orange-500"><span className="w-2 h-2 rounded-full bg-orange-500" /> Vacation</span>
                <span className="flex items-center gap-1.5 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" /> Sick</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-card p-8 border border-border rounded-[2.5rem] shadow-sm transition-colors overflow-hidden">
          <div className="h-[700px] text-sm custom-calendar-wrapper">
            <Calendar
              localizer={localizer}
              events={activeEvents}
              date={currentDate}
              onNavigate={(d) => setCurrentDate(d)}
              view={currentView}
              onView={(v) => setCurrentView(v)}
              eventPropGetter={eventPropGetter}
              className="font-sans"
            />
          </div>
        </div>
      </section>

      {/* CUSTOM CSS FOR CALENDAR IN DARK MODE */}
      <style jsx global>{`
        .custom-calendar-wrapper .rbc-month-view,
        .custom-calendar-wrapper .rbc-time-view {
          border-color: hsl(var(--border));
          background-color: transparent;
        }
        .custom-calendar-wrapper .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        .custom-calendar-wrapper .rbc-today {
          background-color: hsl(var(--primary) / 0.05);
        }
        .custom-calendar-wrapper .rbc-header {
          border-bottom-color: hsl(var(--border));
          padding: 12px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: hsl(var(--muted-foreground));
        }
        .custom-calendar-wrapper .rbc-day-bg + .rbc-day-bg,
        .custom-calendar-wrapper .rbc-month-row + .rbc-month-row {
          border-left-color: hsl(var(--border));
          border-top-color: hsl(var(--border));
        }
      `}</style>
    </div>
  );
}