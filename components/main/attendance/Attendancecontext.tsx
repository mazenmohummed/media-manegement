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
  checkInTime: Date | string;
  checkOutTime?: Date | string | null;
  isLate?: boolean;
  status?: string;
  totalHours?: number | null;
}

interface AttendanceContextValue {
  attendance: AttendanceLog | null;
  loading: boolean;
  error: string | null;
  performAction: (action: "CHECK_IN" | "CHECK_OUT") => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(
  undefined
);

export function AttendanceProvider({
  initialAttendance,
  children,
}: {
  initialAttendance: AttendanceLog | null;
  children: ReactNode;
}) {
  const [attendance, setAttendance] = useState<AttendanceLog | null>(
    initialAttendance
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep in sync if the server-rendered initial value changes
  // (e.g. after a full navigation re-runs the layout's query).
  useEffect(() => {
    setAttendance(initialAttendance);
  }, [initialAttendance]);

  const performAction = async (action: "CHECK_IN" | "CHECK_OUT") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to update attendance");
      }

      const updated: AttendanceLog = await res.json();

      // Single state update here — every component reading
      // useAttendance() re-renders with the new value at once.
      setAttendance(updated);
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
      value={{ attendance, loading, error, performAction }}
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