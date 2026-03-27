"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { 
  Calendar as CalendarIcon, 
  Briefcase, 
  Clock, 
  PlaneTakeoff, 
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { "en-US": enUS },
});

export default function UnifiedCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [visibleLayers, setVisibleLayers] = useState(["TASK", "ATTENDANCE", "LEAVE"]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
  fetch("/api/calendar")
    .then((res) => res.json())
    .then((data) => {
      
      // Convert ISO strings from JSON back into actual Date objects
      const formattedData = data.map((event: any) => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      // If start and end are the same day/time, 
      // push the end to the very last second of the day.
      if (start.getTime() === end.getTime()) {
        end.setHours(23, 59, 59, 999);
      }

      return {
        ...event,
        start,
        end,
        allDay: true,
      };
    });
      setEvents(formattedData);
    })
    .catch((err) => console.error("Calendar sync error:", err));
}, []);
  const filteredEvents = useMemo(() => 
    events.filter(e => visibleLayers.includes(e.resource.type)),
  [events, visibleLayers]);
  console.log(events)

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const eventPropGetter = (event: any) => {
    const colors: any = {
      TASK: event.resource.status === "Completed" ? "#10b981" : "#2563eb",
      ATTENDANCE: "#8b5cf6",
      LEAVE: event.resource.status === "Approved" ? "#f97316" : "#ef4444",
    };
    return {
      style: { backgroundColor: colors[event.resource.type], borderRadius: '6px', fontSize: '10px', border: 'none' }
    };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 p-6 max-w-[1600px] mx-auto">
      
      {/* SECTION 1: SIDEBAR CONTROLS & INTELLIGENCE */}
      <aside className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
          <h1 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" /> Pipeline
          </h1>
          
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">View Filters</p>
            <LayerToggle 
              label="Production Tasks" 
              active={visibleLayers.includes("TASK")} 
              onClick={() => toggleLayer("TASK")}
              icon={<Briefcase size={14}/>}
              color="bg-blue-600"
            />
            <LayerToggle 
              label="Staff Attendance" 
              active={visibleLayers.includes("ATTENDANCE")} 
              onClick={() => toggleLayer("ATTENDANCE")}
              icon={<Clock size={14}/>}
              color="bg-purple-500"
            />
            <LayerToggle 
              label="Leave Registry" 
              active={visibleLayers.includes("LEAVE")} 
              onClick={() => toggleLayer("LEAVE")}
              icon={<PlaneTakeoff size={14}/>}
              color="bg-orange-500"
            />
          </div>
        </div>

        {/* Live Intelligence Stats */}
        <div className="bg-slate-950 text-white p-6 rounded-[2rem] space-y-4">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Metrics</p>
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-60">Active Tasks</span>
            <span className="font-black text-lg">{events.filter(e => e.resource.type === "TASK").length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-60">Staff on Leave</span>
            <span className="font-black text-lg text-orange-400">
              {events.filter(e => e.resource.type === "LEAVE").length}
            </span>
          </div>
        </div>
      </aside>

      {/* SECTION 2 & 3: THE INTERACTIVE CALENDAR PIPELINE */}
      <main className="xl:col-span-3 space-y-6">
        <div className="bg-card p-8 border border-border rounded-[3rem] shadow-sm min-h-[800px]">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventPropGetter}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            date={currentDate}
            defaultView="month" // Add this
            views={['month', 'week', 'day', 'agenda']} // Add this
            className="font-sans text-sm custom-calendar"
            popup={true} // This opens a tooltip when clicking "+x more"
            style={{ height: "100%" }}
          />
        </div>
      </main>

      <style jsx global>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { padding: 15px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #64748b; }
        .rbc-event { transition: transform 0.2s; }
        .rbc-event:hover { transform: scale(1.02); }
        .rbc-off-range-bg { background: transparent; opacity: 0.3; }
        .rbc-today { background: hsl(var(--primary) / 0.03); }
      `}</style>
    </div>
  );
}

function LayerToggle({ label, active, onClick, icon, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
        active ? 'bg-muted border-border' : 'opacity-40 border-transparent grayscale'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      {active ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} />}
    </button>
  );
}