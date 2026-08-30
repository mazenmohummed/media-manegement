// components/main/attendance/AttendanceControl.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, Loader2, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAttendance } from "./AttendanceContext";

export const AttendanceControl = () => {
  const { attendance, loading, error, performAction } = useAttendance();
  const [locationStatus, setLocationStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const isCheckedIn = !!attendance && attendance.checkOutTime === null;

  // ─── Auto-refresh attendance status every 30 seconds ──────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCheckedIn) {
        // Refresh attendance status to check for auto-checkout
        const checkStatus = async () => {
          try {
            const res = await fetch("/api/attendance/today");
            if (res.ok) {
              const data = await res.json();
              // If user was checked out by auto-checkout, reload the page
              if (data.data && data.data.checkOutTime) {
                window.location.reload();
              }
            }
          } catch (error) {
            console.error("Failed to refresh attendance status:", error);
          }
        };
        checkStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isCheckedIn]);

  // ─── Get current location ──────────────────────────────────────────────────
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      setLocationStatus("checking");
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setUserLocation(location);
          setLocationStatus("success");
          resolve(location);
        },
        (err) => {
          setLocationStatus("error");
          setLocationError(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // ─── Handle check-in/check-out click ──────────────────────────────────────
  const handleClick = async () => {
    const action = isCheckedIn ? "CHECK_OUT" : "CHECK_IN";

    // If checking in, validate location first
    if (action === "CHECK_IN") {
      try {
        const location = await getCurrentLocation();
        await performAction(action, location);
        setLastCheckTime(new Date());
      } catch (err: any) {
        // Error already handled in getCurrentLocation
        console.error("Location error:", err);
      }
    } else {
      await performAction(action);
      setLastCheckTime(new Date());
    }
  };

  // ─── Format check-in time ──────────────────────────────────────────────────
  const checkInTime = attendance?.checkInTime
    ? new Date(attendance.checkInTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  // ─── Calculate total hours ─────────────────────────────────────────────────
  const totalHours = attendance?.checkInTime && attendance?.checkOutTime
    ? ((new Date(attendance.checkOutTime).getTime() - new Date(attendance.checkInTime).getTime()) / (1000 * 60 * 60))
    : attendance?.checkInTime
    ? ((new Date().getTime() - new Date(attendance.checkInTime).getTime()) / (1000 * 60 * 60))
    : null;

  // ─── Check if user is late based on attendance status ──────────────────────
  const isLate = attendance?.isLate || attendance?.status === "LATE_CHECKIN";

  return (
    <div
      className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
        isCheckedIn
          ? "bg-emerald-500/5 border-emerald-500/20"
          : attendance?.checkOutTime
          ? "bg-muted/20 border-border/50"
          : "bg-card border-border"
      }`}
    >
      {/* ── Left: Status & Info ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`p-2.5 rounded-xl ${
            isCheckedIn ? "bg-emerald-500/10" : "bg-muted/50"
          }`}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <Clock
              size={16}
              className={isCheckedIn ? "text-emerald-500" : "text-muted-foreground"}
            />
          )}
        </div>

        {/* Status Text */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
            Workday Status
          </p>
          
          {loading ? (
            <p className="text-sm font-black opacity-60">Loading...</p>
          ) : isCheckedIn ? (
            <div className="flex flex-col">
              <p className="text-sm font-black text-emerald-500">
                Active since {checkInTime}
                {isLate && (
                  <span className="ml-2 text-[8px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                    Late
                  </span>
                )}
              </p>
              {totalHours !== null && (
                <p className="text-[10px] font-bold text-muted-foreground">
                  {totalHours.toFixed(1)} hours today
                </p>
              )}
            </div>
          ) : attendance?.checkOutTime ? (
            <div className="flex flex-col">
              <p className="text-sm font-black opacity-60">
                Ended at {new Date(attendance.checkOutTime).toLocaleTimeString("en-US", { 
                  hour: "2-digit", 
                  minute: "2-digit", 
                  hour12: true 
                })}
              </p>
              {totalHours !== null && (
                <p className="text-[10px] font-bold text-muted-foreground">
                  {totalHours.toFixed(1)} hours total
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm font-black opacity-60">Not started</p>
          )}

          {/* Error Messages */}
          {error && (
            <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </p>
          )}
          
          {/* Location Status Messages */}
          {locationStatus === "checking" && (
            <p className="text-[10px] font-bold text-blue-500 mt-1 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Getting location...
            </p>
          )}
          {locationStatus === "success" && userLocation && (
            <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Location verified
            </p>
          )}
          {locationStatus === "error" && locationError && (
            <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {locationError}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: Action Button ────────────────────────────────────────────── */}
      <button
        onClick={handleClick}
        disabled={loading || locationStatus === "checking"}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shrink-0 ${
          isCheckedIn
            ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
            : attendance?.checkOutTime
            ? "bg-muted/30 text-muted-foreground hover:bg-muted/50 cursor-not-allowed"
            : "bg-foreground text-background hover:bg-primary"
        }`}
      >
        {loading || locationStatus === "checking" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : isCheckedIn ? (
          <><LogOut size={12} /> End Workday</>
        ) : attendance?.checkOutTime ? (
          <><Clock size={12} /> Completed</>
        ) : (
          <><LogIn size={12} /> Start Workday</>
        )}
      </button>
    </div>
  );
};