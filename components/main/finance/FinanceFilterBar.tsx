"use client";

import React from "react";
import { Calendar, RotateCcw } from "lucide-react";

export type FinancePreset = "ALL" | "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";

export interface FinanceFilterValue {
  preset: FinancePreset;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
}

export const DEFAULT_FINANCE_FILTER: FinanceFilterValue = {
  preset: "ALL",
  startDate: null,
  endDate: null,
};

const PRESETS: { id: FinancePreset; label: string }[] = [
  { id: "ALL", label: "All Time" },
  { id: "MONTH", label: "This Month" },
  { id: "QUARTER", label: "This Quarter" },
  { id: "YEAR", label: "This Year" },
  { id: "CUSTOM", label: "Custom" },
];

const toISODate = (d: Date) => d.toISOString().split("T")[0];

function computeRangeForPreset(preset: FinancePreset): { startDate: string | null; endDate: string | null } {
  const now = new Date();

  if (preset === "ALL") return { startDate: null, endDate: null };

  if (preset === "MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  if (preset === "QUARTER") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  if (preset === "YEAR") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  // CUSTOM has no computed default — caller seeds it (we fall back to this month)
  return computeRangeForPreset("MONTH");
}

function formatRangeLabel(value: FinanceFilterValue): string {
  if (value.preset === "ALL" || !value.startDate || !value.endDate) return "All Time";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const start = new Date(value.startDate).toLocaleDateString("en-GB", opts);
  const end = new Date(value.endDate).toLocaleDateString("en-GB", opts);
  return `${start} — ${end}`;
}

export default function FinanceFilterBar({
  value,
  onChange,
}: {
  value: FinanceFilterValue;
  onChange: (value: FinanceFilterValue) => void;
}) {
  const handlePresetClick = (preset: FinancePreset) => {
    if (preset === "CUSTOM") {
      if (value.preset === "CUSTOM" && value.startDate && value.endDate) return; // already custom
      const fallback = computeRangeForPreset("CUSTOM");
      onChange({ preset: "CUSTOM", startDate: fallback.startDate, endDate: fallback.endDate });
      return;
    }
    onChange({ preset, ...computeRangeForPreset(preset) });
  };

  return (
    <div className="bg-card border border-border rounded-[2rem] p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-muted text-muted-foreground">
          <Calendar size={14} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden md:inline">
          Period
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePresetClick(p.id)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              value.preset === p.id
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === "CUSTOM" && (
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={value.startDate ?? ""}
            max={value.endDate ?? undefined}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-[10px] font-bold outline-none"
          />
          <span className="text-[9px] font-black text-muted-foreground uppercase">to</span>
          <input
            type="date"
            value={value.endDate ?? ""}
            min={value.startDate ?? undefined}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className="bg-muted/30 border border-border px-3 py-2 rounded-xl text-[10px] font-bold outline-none"
          />
        </div>
      )}

      <div className="md:ml-auto flex items-center gap-3">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          {formatRangeLabel(value)}
        </span>
        {value.preset !== "ALL" && (
          <button
            onClick={() => onChange({ ...DEFAULT_FINANCE_FILTER })}
            title="Reset filter"
            className="p-2 rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}