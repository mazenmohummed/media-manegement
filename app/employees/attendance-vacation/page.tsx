"use client";

import React, { useState, useMemo } from "react";
import { Plus, Clock, Plane, CheckCircle2, XCircle, Search, Calendar as CalendarIcon, UserCheck, Timer } from "lucide-react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale";

import "react-big-calendar/lib/css/react-big-calendar.css";

// --- CALENDAR SETUP ---
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- TYPES ---
interface AttendanceRecord {
  id: string;
  employeeName: string;
  role: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: "Present" | "On Leave" | "Late";
}

interface VacationRequest {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
}

export default function AttendanceManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  // Mock Data
  const [attendance] = useState<AttendanceRecord[]>([
    { id: "1", employeeName: "Ahmed Hassan", role: "Senior Designer", date: "2026-03-07", checkIn: "09:00 AM", checkOut: "05:00 PM", status: "Present" },
    { id: "2", employeeName: "Sara Jones", role: "Videographer", date: "2026-03-07", checkIn: "10:15 AM", checkOut: null, status: "Late" },
  ]);

  const [vacations, setVacations] = useState<VacationRequest[]>([
    { id: "v1", employeeName: "Mazen", startDate: "2026-03-10", endDate: "2026-03-15", reason: "Family Trip", status: "Pending" },
    { id: "v2", employeeName: "Ahmed Hassan", startDate: "2026-04-01", endDate: "2026-04-05", reason: "Annual Leave", status: "Approved" },
  ]);

  // Transform Data for Calendar
  const combinedEvents = useMemo(() => {
    const attendanceEvents = attendance.map(a => ({
      title: `💻 ${a.employeeName} (${a.status})`,
      start: new Date(a.date),
      end: new Date(a.date),
      resource: { type: 'attendance', status: a.status }
    }));

    const vacationEvents = vacations
      .filter(v => v.status === "Approved")
      .map(v => ({
        title: `✈️ ${v.employeeName}: ${v.reason}`,
        start: new Date(v.startDate),
        end: new Date(v.endDate),
        resource: { type: 'vacation', status: 'Approved' }
      }));

    return [...attendanceEvents, ...vacationEvents];
  }, [attendance, vacations]);

  const handleAction = (id: string, status: "Approved" | "Declined") => {
    setVacations(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-background min-h-screen text-foreground space-y-10">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground">Staff Logistics</h1>
          <p className="text-muted-foreground text-sm font-medium">Daily Attendance & Leave Authorization</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search employee..."
            className="pl-11 pr-6 py-3 bg-card border border-border rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-primary/10 w-full md:w-80 transition-all text-foreground"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* CALENDAR SECTION */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <CalendarIcon className="w-3 h-3" /> Team Availability Schedule
        </h2>
        <div className="bg-card p-4 md:p-8 border border-border rounded-[2.5rem] shadow-sm transition-colors">
            <div className="h-[550px] text-sm overflow-hidden rounded-2xl">
              <style>{`
                .rbc-calendar { color: var(--foreground); }
                .rbc-off-range-bg { background: var(--muted) !important; opacity: 0.3; }
                .rbc-header { padding: 12px !important; font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; border-bottom: 1px solid var(--border) !important; }
                .rbc-today { background: var(--primary) !important; opacity: 0.05; }
                .rbc-month-view { border-color: var(--border) !important; border-radius: 16px; }
                .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border) !important; }
                .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border) !important; }
              `}</style>
              <Calendar
                  localizer={localizer}
                  events={combinedEvents}
                  date={currentDate}
                  onNavigate={d => setCurrentDate(d)}
                  view={currentView}
                  onView={v => setCurrentView(v)}
                  eventPropGetter={(event: any) => ({
                      style: {
                          backgroundColor: event.resource.type === 'vacation' ? '#f97316' : '#10b981',
                          borderRadius: '8px', 
                          border: 'none', 
                          fontSize: '10px', 
                          fontFamily: 'inherit',
                          fontWeight: '800',
                          padding: '4px 10px'
                      }
                  })}
              />
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DAILY ATTENDANCE LOG */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
              <UserCheck className="w-3 h-3" /> Live Attendance Log
            </h2>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-6">Employee</th>
                    <th className="p-6 text-center">Check-In</th>
                    <th className="p-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendance.map((row) => (
                    <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="p-6">
                        <p className="font-black text-foreground text-sm uppercase italic">{row.employeeName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{row.role}</p>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-lg">
                          <Timer className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono text-xs font-bold text-foreground">{row.checkIn}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                          row.status === "Present" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* VACATION REQUESTS */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <Plane className="w-3 h-3" /> Pending Requests
          </h2>
          <div className="space-y-4">
            {vacations.map((req) => (
              <div key={req.id} className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight italic">{req.employeeName}</h3>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{req.reason}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
                    req.status === "Pending" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-5 text-muted-foreground">
                  <CalendarIcon className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-bold tracking-tighter">
                    {format(new Date(req.startDate), 'MMM dd')} — {format(new Date(req.endDate), 'MMM dd')}
                  </span>
                </div>

                {req.status === "Pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(req.id, "Approved")} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-[9px] font-black uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => handleAction(req.id, "Declined")} className="flex-1 bg-background border border-border text-muted-foreground py-2.5 rounded-xl text-[9px] font-black uppercase hover:text-red-500 hover:border-red-500/20 transition-all flex items-center justify-center gap-2">
                      <XCircle className="w-3 h-3" /> Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}