"use client";

import React from "react";

interface TodoInput {
  id: string;
  text: string;
  description?: string;
}

interface RentalInput {
  id: string;
  name: string;
  cost: string;
}

interface TaskInput {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  employeeIds: string[];
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
}

interface TaskConfigCardProps {
  type: string;
  detail: TaskInput;
  dbEmployees: { id: string; name: string }[];
  dbAssets: { id: string; assetName: string; category: string }[];
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
  conflicts?: { employees: string[]; assets: string[] };
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

        {/* SPECIALIST & TIME */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase opacity-50">Assign Production Team/Creative</label>
            <div className="flex flex-wrap gap-2">
                {dbEmployees.map((emp) => {
                  const isSelected = detail.employeeIds?.includes(emp.id);
                  // This variable only exists inside this block!
                  const hasConflict = conflicts?.employees.includes(emp.name);

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        // Correct way to toggle the selection
                        const newIds = isSelected 
                        ? detail.employeeIds.filter((id) => id !== emp.id) 
                        : [...(detail.employeeIds || []), emp.id];
                                            
                        updateTaskField(type, "employeeIds", newIds);
                      }}
                      className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all ${
                        hasConflict 
                          ? "bg-red-500 border-red-600 text-white animate-pulse" 
                          : isSelected 
                            ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                            : "bg-white border-border text-muted-foreground"
                      }`}
                    >
                      {emp.name} {hasConflict && "⚠️"}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-[9px] font-black uppercase opacity-50">Start Time</label>
              <input 
                type="time" 
                className="w-full bg-transparent text-xs font-bold" 
                value={detail.startTime} 
                onChange={(e) => updateTaskField(type, "startTime", e.target.value)} 
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-[9px] font-black uppercase opacity-50">End Time</label>
              <input 
                type="time" 
                className="w-full bg-transparent text-xs font-bold" 
                value={detail.endTime} 
                onChange={(e) => updateTaskField(type, "endTime", e.target.value)} 
              />
            </div>
          </div>
        </div>

        
        {/* INTERNAL ASSETS */}
        <div className="space-y-3 p-4 bg-purple-600/5 border border-purple-600/10 rounded-2xl">
          <label className="text-[9px] font-black uppercase text-purple-600 tracking-widest">Internal Assets</label>
          <div className="flex flex-wrap gap-2">
            {dbAssets.map((asset) => {
              const isSelected = detail.assetIds.includes(asset.id);
              // Optional chaining ensures this doesn't crash if conflicts is undefined
              const hasConflict = conflicts?.assets?.includes(asset.assetName);

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    const newIds = isSelected 
                      ? detail.assetIds.filter((id) => id !== asset.id) 
                      : [...detail.assetIds, asset.id];
                    updateTaskField(type, "assetIds", newIds);
                  }}
                  className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all ${
                    hasConflict
                      ? "bg-red-500 border-red-600 text-white animate-pulse"
                      : isSelected 
                        ? "bg-purple-600 border-purple-600 text-white shadow-md" 
                        : "bg-white border-border text-muted-foreground"
                  }`}
                >
                  {asset.assetName} {hasConflict && "⚠️"}
                </button>
              );
            })}
          </div>
        </div>

        {/* DATES */}
        <div className="grid grid-cols-2 gap-6 p-4 bg-muted/20 rounded-2xl border border-border">
          <div className="space-y-1">
            <label className="text-[8px] font-black opacity-40 uppercase">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-transparent text-xs font-bold outline-none" 
              value={detail.startDate} 
              onChange={(e) => updateTaskField(type, "startDate", e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black opacity-40 uppercase">End Date</label>
            <input 
              type="date" 
              className="w-full bg-transparent text-xs font-bold outline-none" 
              value={detail.endDate} 
              onChange={(e) => updateTaskField(type, "endDate", e.target.value)} 
            />
          </div>
        </div>

        {(conflicts?.assets?.length ?? 0) > 0 && (
            <div className="text-red-500 text-[10px] font-bold mt-1">
              ASSET CONFLICT: {conflicts?.assets?.join(", ")} is already booked for this time.
            </div>
          )}  

        {conflicts && ( (conflicts.employees?.length ?? 0) > 0 || (conflicts.assets?.length ?? 0) > 0 ) && (
        <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl animate-pulse">
          <p className="text-[10px] font-black text-red-600 uppercase mb-2">⚠️ Scheduling Conflict Detected</p>
          
          {/* Use optional chaining and fallback array */}
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

        {detail.todos?.map((todo, idx) => (
            <div key={todo.id} className="p-4  border border-border rounded-xl space-y-3 group relative shadow-sm hover:shadow-md transition-shadow">
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

            {/* THE DESCRIPTION TEXTBOX */}
            <textarea
                placeholder="Add details or specific instructions for this sub-task..."
                className="w-full bg-muted/30 p-3 rounded-lg text-[11px] font-medium min-h-[70px] outline-none border border-transparent focus:border-blue-600/10 transition-colors resize-none"
                value={todo.description || ""}
                onChange={(e) => updateTodoDescription(type, todo.id, e.target.value)}
            />
            </div>
        ))}

        {/* EMPTY STATE */}
        {(!detail.todos || detail.todos.length === 0) && (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl bg-muted/5">
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-muted-foreground">No tasks assigned yet</p>
            </div>
        )}
        </div>

        {/* EXTERNAL RENTALS */}
        {detail.rentals && detail.rentals.length > 0 && (
          <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">External Resource Rentals</p>
            {detail.rentals.map((r) => (
              <div key={r.id} className="flex items-center gap-4 border-b border-amber-500/10 pb-2 group">
                <input
                  placeholder="Item Name"
                  className="flex-1 bg-transparent text-xs font-bold outline-none"
                  value={r.name}
                  onChange={(e) => updateRentalField(type, r.id, "name", e.target.value)}
                />
                <div className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border">
                  <span className="text-[10px] font-bold opacity-30">$</span>
                  <input
                    placeholder="Cost"
                    type="number"
                    className="w-16 bg-transparent text-xs font-black outline-none"
                    value={r.cost}
                    onChange={(e) => updateRentalField(type, r.id, "cost", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRental(type, r.id)}
                  className="text-red-500 hover:scale-110 transition-transform px-2"
                >
                  ✕
                </button>
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