"use client";

import React, { useMemo, useState } from "react";

export interface TodoInput {
  id: string;
  text: string;
  description?: string;
}

export interface RentalInput {
  id: string;
  name: string;      // maps to resourceName
  cost: string;      // maps to cost on TaskExpense
  category: string;
  description: string;
  status: string;
}

export interface TaskEmployee {
  id: string;
  salary: string;
}

export interface TaskInput {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  employeeIds: TaskEmployee[];
  assetIds: string[];
  grossRevenue: string;
  margin: string;
  notes: string;
  rentals: RentalInput[];
  locationName?: string;
  latitude?: number;
  longitude?: number;
  isSearching?: boolean;
  todos: TodoInput[];
  isOutOfWorkingHours?: boolean;
  compensationStrategy?: "NONE" | "OVERTIME" | "COMMISSION";
  compensationAmount?: string; // 👈 Track extra bonus/overtime pool rate globally
  deductionStrategy?: "NONE" | "DEDUCT_DAY";
}

export interface TaskConfigCardProps {
  type: string;
  detail: TaskInput;
  dbEmployees: { 
    id: string; 
    name: string; 
    userType: string; 
    role: string; 
    verifiedSkills: string[] 
  }[];
  dbAssets: { id: string; assetName: string; category: string, availabilityStatus: string, }[];
  updateTaskField: (dept: string, field: keyof TaskInput, value: any) => void;
  addRental: (dept: string) => void;
  removeRental: (dept: string, rentalId: string) => void;
  updateRentalField: (dept: string, rentalId: string, field: keyof RentalInput, value: string) => void;
  addTodo: (dept: string) => void;
  removeTodo: (dept: string, todoId: string) => void;
  updateTodoText: (dept: string, todoId: string, text: string) => void;
  updateTodoDescription: (dept: string, todoId: string, description: string) => void;
  handleUseCurrentLocation: (type: string) => void;
  handleSearch: (query: string, type: string) => void;
  conflicts?: { employees?: string[]; assets?: string[] };
}

export function TaskConfigCard({
  type,
  detail,
  dbEmployees,
  dbAssets,
  conflicts,
  updateTaskField,
  addRental,
  removeRental,
  updateRentalField,
  addTodo,
  removeTodo,
  updateTodoDescription,
  updateTodoText,
  handleUseCurrentLocation,
  handleSearch,
}: TaskConfigCardProps) {

  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);
  const [empSearch, setEmpSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");

  const [currentAssetPage, setCurrentAssetPage] = useState(1);
  const ASSETS_PER_PAGE = 6;

  // defensive defaults
  const employeeList = detail.employeeIds || [];
  const assetList = detail.assetIds || [];
  const rentalsList = detail.rentals || [];
  const todosList = detail.todos || [];

  // Filter the employees first
  const filteredEmployees = useMemo(() => {
    return dbEmployees.filter(emp =>
      emp.name.toLowerCase().includes(empSearch.toLowerCase())
    );
  }, [dbEmployees, empSearch]);

  // Calculate pagination boundaries
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  // Reset to page 1 when searching
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpSearch(e.target.value);
    setCurrentPage(1);
  };

  // Safe parsed modifier calculation rate to add to active personnel 
  const extraCompensation = useMemo(() => {
    if (!detail.isOutOfWorkingHours || detail.compensationStrategy === "NONE") return 0;
    return Number(detail.compensationAmount) || 0;
  }, [detail.isOutOfWorkingHours, detail.compensationStrategy, detail.compensationAmount]);

  return (
    <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* HEADER */}
      <div className="px-8 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
        <span className="text-[11px] font-black uppercase tracking-widest">{type} Configuration</span>
        <button
          type="button"
          onClick={() => addRental(type)}
          className="text-[10px] font-black text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-full border border-blue-600 transition-all"
        >
          + ADD EXPENSES
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* FINANCIALS & MARGINS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Gross Revenue ($)</label>
            <input
              type="number"
              className="w-full p-4 rounded-xl bg-blue-600/5 border border-blue-600/10 text-xs font-black outline-none"
              value={detail.grossRevenue}
              onChange={(e) => updateTaskField(type, "grossRevenue", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Target Margin (%)</label>
            <input
              type="number"
              className="w-full p-4 rounded-xl bg-emerald-600/5 border border-emerald-600/10 text-xs font-black outline-none"
              value={detail.margin}
              onChange={(e) => updateTaskField(type, "margin", e.target.value)}
            />
          </div>
        </div>

        {/* SHIFT SCHEDULE SETTINGS */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          detail.isOutOfWorkingHours 
            ? "bg-red-600/5 border-red-600/20 shadow-sm" 
            : "bg-muted/20 border-border"
        }`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-red-600 tracking-widest block">
                Shift Schedule Settings
              </label>
              <p className="text-[10px] font-bold text-muted-foreground">
                Toggle if this assignment falls outside corporate standard operating hours.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const active = !detail.isOutOfWorkingHours;
                updateTaskField(type, "isOutOfWorkingHours", active);
                if (!active) {
                  updateTaskField(type, "compensationStrategy", "NONE");
                  updateTaskField(type, "compensationAmount", "");
                  updateTaskField(type, "deductionStrategy", "NONE");
                }
              }}
              className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all uppercase tracking-wider ${
                detail.isOutOfWorkingHours
                  ? "bg-red-600 text-white border-red-600 shadow-md scale-[0.98]"
                  : "text-red-600 border-red-600/30 hover:bg-red-600/10"
              }`}
            >
              {detail.isOutOfWorkingHours ? "✓ Out Working Time Active" : "⏱ Out Working Time"}
            </button>
          </div>

          {/* CONDITIONAL STRATEGY OPTIONS */}
          {detail.isOutOfWorkingHours && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-red-600/10 animate-in slide-in-from-top-2 duration-200">
              
              {/* COMPENSATION STRATEGY */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-red-600 tracking-widest block ml-1">
                  Team Compensation Strategy
                </label>
                <select
                  className="w-full bg-background border border-red-600/20 p-3 rounded-xl text-[11px] font-bold outline-none focus:border-red-600/50 transition-colors"
                  value={detail.compensationStrategy || "NONE"}
                  onChange={(e) => {
                    updateTaskField(type, "compensationStrategy", e.target.value);
                    if (e.target.value === "NONE") {
                      updateTaskField(type, "compensationAmount", "");
                    }
                  }}
                >
                  <option value="NONE">No Additional Remuneration (Standard)</option>
                  <option value="OVERTIME">Pay Overtime Rates</option>
                  <option value="COMMISSION">Pay Commission Bonus</option>
                </select>

                {/* CONDITIONAL AMOUNT FIELD */}
                {(detail.compensationStrategy === "OVERTIME" || detail.compensationStrategy === "COMMISSION") && (
                  <div className="mt-2 space-y-1 animate-in zoom-in-95 duration-150">
                    <label className="text-[8px] font-black uppercase text-amber-600 tracking-widest block ml-1">
                      {detail.compensationStrategy === "OVERTIME" ? "Overtime Flat Rate ($)" : "Commission Amount ($)"}
                    </label>
                    <input
                      type="number"
                      placeholder="Enter premium amount..."
                      className="w-full p-2.5 rounded-xl bg-amber-600/5 border border-amber-500/30 text-[11px] font-black outline-none focus:border-amber-500"
                      value={detail.compensationAmount || ""}
                      onChange={(e) => updateTaskField(type, "compensationAmount", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* SALARY DEDUCTION STRATEGY */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-red-600 tracking-widest block ml-1">
                  Attendance / Absence Policy
                </label>
                <select
                  className="w-full bg-background border border-red-600/20 p-3 rounded-xl text-[11px] font-bold outline-none focus:border-red-600/50 transition-colors"
                  value={detail.deductionStrategy || "NONE"}
                  onChange={(e) => updateTaskField(type, "deductionStrategy", e.target.value)}
                >
                  <option value="NONE">Will Not Deduct (Working Remotely / On-Set)</option>
                  <option value="DEDUCT_DAY">Deduct 1 Day From Base Salary (Skipping Office)</option>
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Assign Production Team/Creative */}
        <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-50 tracking-widest">
                Assign Production Team/Creative
              </label>
              <p className="text-[8px] font-bold text-blue-600">
                PAGE {currentPage} OF {totalPages || 1}
              </p>
            </div>

            {/* SEARCH BAR */}
            <div className="relative group w-full md:w-64">
              <input
                type="text"
                placeholder="Search employees..."
                className="w-full p-3 pl-10 rounded-xl bg-muted/30 border border-border text-[11px] font-bold outline-none focus:border-blue-600/50 transition-all"
                value={empSearch}
                onChange={handleSearchChange}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>
          </div>

          {/* LIST AREA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
            {paginatedEmployees.map((emp) => {
              const hasConflict = !!(conflicts?.employees?.includes(emp.name));
              const selectedObj = employeeList.find((e) => e.id === emp.id);
              const isSelected = !!selectedObj;

              // Combined runtime display values
              const currentBase = isSelected ? (Number(selectedObj.salary) || 0) : 0;
              const runningTotal = currentBase + extraCompensation;

              return (
                <div key={emp.id} className="flex flex-col gap-2">
                  <div
                    onClick={() => {
                      const newSelection = isSelected
                        ? employeeList.filter((e) => e.id !== emp.id)
                        : [...employeeList, { id: emp.id, salary: "0" }];
                      
                      updateTaskField(type, "employeeIds", newSelection);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600/5 border-blue-600/40 shadow-sm"
                        : "bg-muted/30 border-transparent hover:border-border"
                    }`}
                  >
                    {/* CHECKBOX */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <span className="text-[10px] text-white">✓</span>}
                    </div>

                    {/* EMPLOYEE INFO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black uppercase truncate ${hasConflict ? "text-red-500" : "text-foreground"}`}>
                          {emp.name}
                        </span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-muted font-bold opacity-60 uppercase shrink-0">
                          {emp.userType}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[8px] font-bold text-blue-600 bg-blue-600/10 px-1.5 py-0.5 rounded">
                          {emp.role}
                        </span>
                        {emp.verifiedSkills?.slice(0, 2).map((skill) => (
                          <span key={skill} className="text-[8px] font-medium text-emerald-600 bg-emerald-600/5 border border-emerald-600/10 px-1.5 py-0.5 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* CONFLICT ALERT */}
                    {hasConflict && (
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[14px]">⚠️</span>
                        <span className="text-[7px] font-black text-red-500 animate-pulse uppercase">Booked</span>
                      </div>
                    )}
                  </div>

                  {/* SALARY INPUT + CALCULATED PREMIUM SUMMARY */}
                  {isSelected && (
                    <div className="flex flex-col gap-2 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl mx-1 animate-in slide-in-from-top-1">
                      <div className="flex items-center gap-3">
                        <label className="text-[8px] font-black text-blue-600 uppercase whitespace-nowrap">Day Rate $</label>
                        <input
                          type="number"
                          className="w-full bg-transparent text-[10px] font-black outline-none text-blue-800 placeholder:text-blue-300"
                          placeholder="0"
                          onClick={(e) => e.stopPropagation()} 
                          value={selectedObj.salary}
                          onChange={(e) => {
                            const updated = employeeList.map((item) =>
                              item.id === emp.id ? { ...item, salary: e.target.value } : item
                            );
                            updateTaskField(type, "employeeIds", updated);
                          }}
                        />
                      </div>
                      
                      {/* Premium Summary Pill */}
                      {extraCompensation > 0 && (
                        <div className="flex justify-between items-center border-t border-blue-600/10 pt-1.5 mt-0.5 text-[9px] font-black text-blue-900 uppercase">
                          <span>Total Pay (With Premium):</span>
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[8px]">
                            ${runningTotal}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 mt-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:text-blue-600 transition-all"
              >
                Prev
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 rounded-md text-[9px] font-black transition-all ${
                      currentPage === page ? "bg-blue-600 text-white" : "bg-muted hover:bg-border text-foreground"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:text-blue-600 transition-all"
              >
                Next
              </button>
            </div>
          )}

          {filteredEmployees.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-tighter text-muted-foreground">
                No team members match your search
              </p>
            </div>
          )}
        </div>

        {/* INTERNAL ASSETS */}
        <div className="grid grid-cols-1 gap-4 p-4 bg-purple-600/5 border border-purple-600/10 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end px-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-purple-600 tracking-widest block">
                Internal Assets & Equipment
              </label>
              <span className="text-[8px] font-bold text-purple-400 uppercase">
                {assetList.length} Selected • 6 Per Page
              </span>
            </div>

            <div className="relative group">
              <input
                type="text"
                placeholder="Search equipment..."
                className="w-full p-3 pl-10 rounded-xl bg-muted/30 border border-border text-[11px] font-bold outline-none focus:border-blue-600/50 transition-all"
                value={assetSearch}
                onChange={(e) => {
                  setAssetSearch(e.target.value);
                  setCurrentAssetPage(1);
                }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 min-h-[160px]">
            {(() => {
              const filtered = dbAssets.filter((asset) =>
                asset.assetName.toLowerCase().includes(assetSearch.toLowerCase())
              );
              
              const totalAssetPages = Math.max(1, Math.ceil(filtered.length / ASSETS_PER_PAGE));
              const startIdx = (currentAssetPage - 1) * ASSETS_PER_PAGE;
              const paginated = filtered.slice(startIdx, startIdx + ASSETS_PER_PAGE);

              if (filtered.length === 0) {
                return <p className="col-span-full text-center py-10 text-[10px] font-bold opacity-30 uppercase tracking-widest">No assets found</p>;
              }

              return (
                <>
                  {paginated.map((asset) => {
                    const isSelected = assetList.includes(asset.id);
                    const hasConflict = !!(conflicts?.assets?.includes(asset.assetName));
                    const isUnavailable = asset.availabilityStatus !== "Available";

                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          if (isUnavailable && !isSelected) return; 
                          const newIds = isSelected
                            ? assetList.filter((id) => id !== asset.id)
                            : [...assetList, asset.id];
                          updateTaskField(type, "assetIds", newIds);
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group/card ${
                          hasConflict
                            ? "bg-red-500/10 border-red-500 animate-pulse"
                            : isSelected
                            ? "bg-purple-600 border-purple-600 text-white shadow-lg scale-[0.98]"
                            : isUnavailable 
                            ? "bg-muted/50 border-dashed border-border opacity-50 cursor-not-allowed"
                            : "bg-muted/30  border-border hover:border-purple-600/30"
                        }`}
                      >
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          isSelected ? "bg-white border-white" : "bg-transparent border-purple-600/20"
                        }`}>
                          {isSelected && <span className="text-[10px] text-purple-600 font-bold">✓</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-black uppercase truncate block ${isSelected ? "text-white" : "text-foreground"}`}>
                            {asset.assetName}
                          </span>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isSelected ? "bg-white/20 text-white" : "bg-purple-600/10 text-purple-600"
                            }`}>
                              {asset.category}
                            </span>
                            <span className={`text-[7px] font-black ${
                              isUnavailable ? "text-red-500" : isSelected ? "text-purple-200" : "text-emerald-500"
                            }`}>
                              {isUnavailable ? asset.availabilityStatus : "● ONLINE"}
                            </span>
                          </div>
                        </div>

                        {hasConflict && (
                          <span className="text-[7px] font-black text-red-500 bg-white px-1 rounded shadow-sm">
                            CONFLICT
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {totalAssetPages > 1 && (
                    <div className="col-span-full flex items-center justify-between pt-4 px-2 border-t border-purple-600/10 mt-2">
                      <button
                        type="button"
                        disabled={currentAssetPage === 1}
                        onClick={() => setCurrentAssetPage(prev => prev - 1)}
                        className="text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 hover:text-purple-600 transition-colors"
                      >
                        ← Prev
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: totalAssetPages }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-all ${
                              currentAssetPage === i + 1 ? "bg-purple-600 w-4" : "bg-purple-200 w-1"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={currentAssetPage === totalAssetPages}
                        onClick={() => setCurrentAssetPage(prev => prev + 1)}
                        className="text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 hover:text-purple-600 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* DATE & TIME SCHEDULING CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border border-border rounded-2xl">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-foreground/60 tracking-widest block">
              Execution Start Schedule
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 p-3 rounded-xl bg-background border border-border text-[11px] font-bold outline-none focus:border-blue-600/40 transition-all"
                value={detail.startDate}
                onChange={(e) => updateTaskField(type, "startDate", e.target.value)}
              />
              <input
                type="time"
                className="w-24 p-3 rounded-xl bg-background border border-border text-[11px] font-bold outline-none focus:border-blue-600/40 transition-all"
                value={detail.startTime || "09:00"}
                onChange={(e) => updateTaskField(type, "startTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-foreground/60 tracking-widest block">
              Execution Deadline Schedule
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 p-3 rounded-xl bg-background border border-border text-[11px] font-bold outline-none focus:border-blue-600/40 transition-all"
                value={detail.endDate}
                onChange={(e) => updateTaskField(type, "endDate", e.target.value)}
              />
              <input
                type="time"
                className="w-24 p-3 rounded-xl bg-background border border-border text-[11px] font-bold outline-none focus:border-blue-600/40 transition-all"
                value={detail.endTime || "18:00"}
                onChange={(e) => updateTaskField(type, "endTime", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* CONFLICT LOGGING CONTAINER */}
        {conflicts && ( (conflicts.employees?.length ?? 0) > 0 || (conflicts.assets?.length ?? 0) > 0 ) && (
          <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl animate-pulse">
            <p className="text-[10px] font-black text-red-600 uppercase mb-2">⚠️ Scheduling Conflict Detected</p>
            {conflicts.employees?.map(name => (
              <p key={name} className="text-[9px] font-bold text-red-700">
                • {name} is already booked for these dates.
              </p>
            ))}
            {conflicts.assets?.map(name => (
              <p key={name} className="text-[9px] font-bold text-red-700">
                • Asset "{name}" is currently in use elsewhere.
              </p>
            ))}
            <p className="text-[8px] font-medium text-red-500 mt-2 italic">
              Please adjust dates or select alternative resources.
            </p>
          </div>
        )}

        {/* TO-DO LIST SECTION */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black uppercase text-blue-600 tracking-widest">
              Task Checklist
            </label>
            <button
              type="button"
              onClick={() => addTodo(type)}
              className="text-[9px] font-black bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-lg transition-all"
            >
              + ADD TASK
            </button>
          </div>

          {todosList?.map((todo, idx) => (
            <div key={todo.id} className="p-4 border border-border rounded-xl space-y-3 group relative shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 items-center">
                <span className="text-[10px] font-black opacity-20">{idx + 1}</span>
                <input
                  placeholder="Task title (e.g. Color Grading)..."
                  className="flex-1 bg-transparent text-xs font-black uppercase outline-none border-b border-transparent focus:border-blue-600/20 py-1"
                  value={todo.text}
                  onChange={(e) => updateTodoText(type, todo.id, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeTodo(type, todo.id)}
                  className="text-red-500 hover:scale-110 transition-transform p-1"
                >
                  ✕
                </button>
              </div>
              <textarea
                placeholder="Add details or specific instructions for this sub-task..."
                className="w-full bg-muted/30 p-3 rounded-lg text-[11px] font-medium min-h-[70px] outline-none border border-transparent focus:border-blue-600/10 transition-colors resize-none"
                value={todo.description || ""}
                onChange={(e) => updateTodoDescription(type, todo.id, e.target.value)}
              />
            </div>
          ))}

          {(!todosList || todosList.length === 0) && (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl bg-muted/5">
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-muted-foreground">No tasks assigned yet</p>
            </div>
          )}
        </div>

        {/* EXTERNAL RENTALS / EXPENSES */}
        {rentalsList && rentalsList.length > 0 && (
          <div className="space-y-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-[2rem]">
            <div className="flex justify-between items-center px-1">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                External Resource Expenses
              </p>
              <span className="text-[8px] font-bold opacity-40 uppercase">
                {rentalsList.length} Items Listed
              </span>
            </div>

            {rentalsList.map((r) => (
              <div key={r.id} className="relative p-4 bg-amber-500/5  border border-amber-500/10 rounded-2xl group transition-all hover:border-amber-500/30">
                {/* ROW 1: NAME & COST & DELETE */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      placeholder="Resource Name (e.g. Sony FX6 Rental)"
                      className="w-full bg-transparent text-[11px] font-black uppercase outline-none placeholder:opacity-30"
                      value={r.name}
                      onChange={(e) => updateRentalField(type, r.id, "name", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <span className="text-[10px] font-black text-amber-600">$</span>
                    <input
                      placeholder="0.00"
                      type="number"
                      className="w-16 bg-transparent text-xs font-black outline-none text-amber-700"
                      value={r.cost}
                      onChange={(e) => updateRentalField(type, r.id, "cost", e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRental(type, r.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* ROW 2: CATEGORY & STATUS */}
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase opacity-40 ml-1">Category</label>
                    <select
                      className="w-full bg-muted/40 p-2 rounded-lg text-[10px] font-bold outline-none border border-transparent focus:border-amber-500/20"
                      value={r.category}
                      onChange={(e) => updateRentalField(type, r.id, "category", e.target.value)}
                    >
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="LOCATION">Location/Studio</option>
                      <option value="TRANSPORT">Transport</option>
                      <option value="CATERING">Catering</option>
                      <option value="TALENT">Talent/Model</option>
                    </select>
                  </div>
                </div>

                {/* ROW 3: DESCRIPTION */}
                <div className="space-y-1">
                  <label className="text-[7px] font-black uppercase opacity-40 ml-1">Notes / Description</label>
                  <textarea
                    placeholder="Additional details, serial numbers, or vendor info..."
                    className="w-full bg-muted/20 p-2 rounded-lg text-[10px] font-medium min-h-[40px] outline-none resize-none border border-transparent focus:border-amber-500/20"
                    value={r.description || ""}
                    onChange={(e) => updateRentalField(type, r.id, "description", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LOCATION & GEOFENCING */}
        {(type === "Video" || type === "Photo") && (
          <div className="space-y-3 p-4 bg-emerald-600/5 border border-emerald-600/10 rounded-2xl">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Egypt Production Location</label>
              {detail.isSearching && (
                <div className="flex items-center gap-2 text-[8px] font-bold text-emerald-600 animate-pulse">
                  <div className="w-2 h-2 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  MAPPING...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUseCurrentLocation(type)}
                className="h-8 w-8 flex items-center justify-center bg-white border border-emerald-600/20 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                title="Use Current Location"
              >
                <span className="text-xs">◎</span>
              </button>
              <input
                type="text"
                placeholder="Search (e.g. Fish Market, Sheraton Street)..."
                className="flex-1 bg-transparent text-xs font-bold outline-none border-b border-emerald-600/20 pb-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch((e.target as HTMLInputElement).value, type);
                  }
                }}
              />
              <button
                type="button"
                disabled={detail.isSearching}
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  handleSearch(input.value, type);
                }}
                className="h-8 w-20 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {detail.isSearching ? "..." : "SEARCH"}
              </button>
            </div>
            {detail.latitude && (
              <a
                href={`https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`}
                target="_blank"
                className="text-[7px] font-bold text-blue-500 underline mt-1 block"
              >
                VIEW ON GOOGLE MAPS
              </a>
            )}
            <div className="flex flex-col gap-1">
              {detail.locationName && !detail.isSearching && (
                <p className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 p-2 rounded-lg border border-emerald-600/10 truncate">
                  📍 {detail.locationName}
                </p>
              )}
              <div className="flex gap-4 px-1">
                <span className="text-[7px] font-mono opacity-50 uppercase">Lat: {detail.latitude?.toFixed(6) || "---"}</span>
                <span className="text-[7px] font-mono opacity-50 uppercase">Lng: {detail.longitude?.toFixed(6) || "---"}</span>
              </div>
            </div>
          </div>
        )}

        <textarea
          placeholder="Notes..."
          className="w-full p-4 bg-muted/20 border border-border rounded-2xl text-sm min-h-[80px]"
          value={detail.notes}
          onChange={(e) => updateTaskField(type, "notes", e.target.value)}
        />
      </div>
    </div>
  );
}