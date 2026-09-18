// components/main/attendance/AttendanceContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface AttendanceLog {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  isLate: boolean;
  isEarlyOut: boolean;
  status: string;
  type: string;
  totalHours: number | null;
}

interface AttendanceContextValue {
  attendance: AttendanceLog | null;
  loading: boolean;
  error: string | null;
  performAction: (action: "CHECK_IN" | "CHECK_OUT", location?: { lat: number; lng: number }) => Promise<void>;
  refreshAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(
  undefined
);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    try {
      const response = await fetch("/api/attendance");
      const data = await response.json();
      if (data.success) {
        setAttendance(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  const performAction = async (
    action: "CHECK_IN" | "CHECK_OUT",
    location?: { lat: number; lng: number }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const body: any = { type: "OFFICE" };
      
      // Include location for check-in
      if (action === "CHECK_IN" && location) {
        body.latitude = location.lat;
        body.longitude = location.lng;
      }

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action === "CHECK_IN" ? "check in" : "check out"}`);
      }

      // Fetch the updated attendance
      await fetchAttendance();
      
      // Dispatch event for other components
      window.dispatchEvent(new Event("attendance-updated"));
    } catch (err) {
      console.error("Attendance action failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{ 
        attendance, 
        loading, 
        error, 
        performAction, 
        refreshAttendance: fetchAttendance 
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return ctx;
}