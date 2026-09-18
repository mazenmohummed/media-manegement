// components/main/attendance/AttendanceContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────

export interface AttendanceLog {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  isLate: boolean;
  isEarlyOut: boolean;
  totalHours: number | null;
  status: string;
  type: string;
}

// ✅ Accept both casing conventions for compatibility
type CheckInAction =
  | 'check-in'
  | 'CHECK_IN'
  | 'checkin'
  | 'CHECKIN';

type CheckOutAction =
  | 'check-out'
  | 'CHECK_OUT'
  | 'checkout'
  | 'CHECKOUT';

type AttendanceAction = CheckInAction | CheckOutAction;

interface AttendanceContextValue {
  attendance: AttendanceLog | null;
  loading: boolean;
  error: string | null;
  /**
   * Perform a check-in or check-out action.
   * Accepts both kebab-case and SCREAMING_SNAKE_CASE for backward compatibility.
   */
  performAction: (
    action: AttendanceAction,
    location?: { lat: number; lng: number }
  ) => Promise<void>;
  /** Alias of refreshAttendance */
  refresh: () => Promise<void>;
  /** Fetch the latest attendance state from the server */
  refreshAttendance: () => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function isCheckIn(action: AttendanceAction): boolean {
  return (
    action === 'check-in' ||
    action === 'CHECK_IN' ||
    action === 'checkin' ||
    action === 'CHECKIN'
  );
}

// ─── Context ────────────────────────────────────────────────────────────

const AttendanceContext = createContext<AttendanceContextValue | undefined>(
  undefined
);

// ─── Provider ───────────────────────────────────────────────────────────

export function AttendanceProvider({
  children,
  initialAttendance = null,
}: {
  children: ReactNode;
  initialAttendance?: AttendanceLog | null;
}) {
  const [attendance, setAttendance] = useState<AttendanceLog | null>(
    initialAttendance
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Attendance ────────────────────────────────────────────────

  const fetchAttendance = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/attendance');
      if (!res.ok) throw new Error('Failed to fetch attendance');

      const data = await res.json();

      // ✅ Support both response shapes: { attendance } and { success, data }
      const attendanceData =
        data.attendance ?? (data.success ? data.data : null);

      setAttendance(attendanceData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load attendance';
      setError(message);
      console.error('Error fetching attendance:', err);
    }
  }, []);

  // ─── Initial fetch + auto-refresh every 30s ──────────────────────────

  useEffect(() => {
    fetchAttendance();

    const interval = setInterval(fetchAttendance, 30000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  // ─── Perform Action (check-in / check-out) ───────────────────────────

  const performAction = useCallback(
    async (
      action: AttendanceAction,
      location?: { lat: number; lng: number }
    ) => {
      setLoading(true);
      setError(null);

      try {
        // Determine the correct action string for the API
        const isCheckInAction = isCheckIn(action);
        const apiAction = isCheckInAction ? 'check-in' : 'check-out';

        // Build the request body
        // - Some APIs expect `{ action }`
        // - Others expect `{ type, latitude, longitude }`
        // Send both, so the backend can pick what it needs.
        const body: Record<string, any> = {
          action: apiAction,
          type: 'OFFICE',
        };

        if (isCheckInAction && location) {
          body.latitude = location.lat;
          body.longitude = location.lng;
        }

        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || (data.success === false)) {
          throw new Error(
            data.error ||
              `Failed to ${isCheckInAction ? 'check in' : 'check out'}`
          );
        }

        // ✅ Update state immediately from the response (faster UX)
        const updatedAttendance =
          data.attendance ?? (data.success ? data.data : null);
        if (updatedAttendance) {
          setAttendance(updatedAttendance);
        }

        // ✅ Then re-fetch to stay in sync with the server
        await fetchAttendance();

        // ✅ Notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('attendance-updated'));
        }

        toast.success(
          isCheckInAction ? 'Checked in successfully' : 'Checked out successfully'
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong';
        setError(message);
        toast.error(message);
        console.error('Attendance action failed:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchAttendance]
  );

  // ─── Context Value ───────────────────────────────────────────────────

  return (
    <AttendanceContext.Provider
      value={{
        attendance,
        loading,
        error,
        performAction,
        refresh: fetchAttendance,
        refreshAttendance: fetchAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return ctx;
}