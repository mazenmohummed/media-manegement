// components/main/attendance/AttendanceControl.tsx
"use client";

import React from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { useAttendance } from "./Attendancecontext";

export const AttendanceControl = () => {
  // Same shared context Sidebar reads/writes — clicking here updates
  // the Sidebar widget instantly, and vice versa.
  const { attendance, loading, error, performAction } = useAttendance();

  const isCheckedIn = !!attendance && attendance.checkOutTime === null;

  const handleClick = () => {
    performAction(isCheckedIn ? "CHECK_OUT" : "CHECK_IN").catch(() => {
      // error is already captured in context state and rendered below
    });
  };

  const checkInTime = attendance?.checkInTime
    ? new Date(attendance.checkInTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div
      className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
        isCheckedIn
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl ${
            isCheckedIn ? "bg-emerald-500/10" : "bg-muted/50"
          }`}
        >
          <Clock
            size={16}
            className={isCheckedIn ? "text-emerald-500" : "text-muted-foreground"}
          />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
            Workday Status
          </p>
          {isCheckedIn ? (
            <p className="text-sm font-black text-emerald-500">
              Active since {checkInTime}
              {attendance?.isLate && (
                <span className="ml-2 text-[8px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                  Late
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm font-black opacity-60">
              {attendance?.checkOutTime
                ? `Ended at ${new Date(attendance.checkOutTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                : "Not started"}
            </p>
          )}
          {error && (
            <p className="text-[10px] font-bold text-rose-500 mt-1">{error}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shrink-0 ${
          isCheckedIn
            ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
            : "bg-foreground text-background hover:bg-primary"
        }`}
      >
        {loading ? (
          "Processing..."
        ) : isCheckedIn ? (
          <><LogOut size={12} /> End Workday</>
        ) : (
          <><LogIn size={12} /> Start Workday</>
        )}
      </button>
    </div>
  );
};