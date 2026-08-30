"use client";
import React from "react";
import { Users } from "lucide-react";

export default function AttendanceCard({ todayLogs }: { todayLogs: any[] }) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-primary" />
        <h3 className="font-bold">Today's Attendees</h3>
      </div>
      
      <div className="space-y-3">
        {todayLogs.length > 0 ? (
          todayLogs.map((log) => (
            <div key={log.id} className="flex justify-between items-center text-sm">
              <span className="font-medium">{log.user?.name || "Unknown"}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${log.checkOutTime ? 'bg-zinc-100 text-zinc-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {log.checkOutTime ? "Checked Out" : "Present"}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No attendance records for today.</p>
        )}
      </div>
    </div>
  );
}