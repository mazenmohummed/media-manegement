// components/tasks/AssetsCard.tsx
"use client";

import { useState } from "react";
import { Package, Plus, Search, X, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Asset {
  id: string;
  assetName: string;
  assetNo: string | null;
  availabilityStatus: string;
  currentValue?: number;
  category?: string;
}

interface AssetsCardProps {
  taskId: string;
  assets: Asset[];
  onUpdate: () => void;
  taskStartDate?: string | null;
  taskEndDate?: string | null;
  taskTitle?: string | null;
}

export function AssetsCard({ 
  taskId, 
  assets, 
  onUpdate,
  taskStartDate,
  taskEndDate,
  taskTitle 
}: AssetsCardProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [bookingDates, setBookingDates] = useState({
    startDate: taskStartDate || new Date().toISOString().split('T')[0],
    endDate: taskEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const searchAssets = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/assets?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const assignedAssetIds = new Set(assets.map(a => a.id));
        setResults((data.assets || []).filter((a: any) => !assignedAssetIds.has(a.id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const assignAsset = async (assetId: string) => {
    setAssignmentError(null);
    setAssigning(assetId);
    try {
      // Use the asset booking service endpoint
      const res = await fetch(`/api/assets/${assetId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          taskId,
          startDate: bookingDates.startDate,
          endDate: bookingDates.endDate,
        }),
      });

      if (res.ok) {
        setShowAdd(false);
        setShowDatePicker(false);
        setSearch("");
        setResults([]);
        setSelectedAssetId(null);
        onUpdate();
      } else {
        const error = await res.json();
        setAssignmentError(error.error || "Failed to assign asset");
      }
    } catch (err) {
      console.error(err);
      setAssignmentError("Network error occurred");
    } finally {
      setAssigning(null);
    }
  };

  const unassignAsset = async (assetId: string) => {
    setUnassigning(assetId);
    try {
      const res = await fetch(`/api/assets/${assetId}/release?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUnassigning(null);
    }
  };

  const handleAssignClick = (assetId: string) => {
    setSelectedAssetId(assetId);
    setShowDatePicker(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      IN_USE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      MAINTENANCE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      RETIRED: "bg-red-500/10 text-red-500 border-red-500/20",
      LOST: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    };
    return colors[status] || colors.AVAILABLE;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-400" /> Assets
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
            {assets.length}
          </Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-zinc-500 hover:text-zinc-300"
          onClick={() => {
            setShowAdd(!showAdd);
            setAssignmentError(null);
            setSearch("");
            setResults([]);
            setShowDatePicker(false);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {assignmentError && (
        <div className="bg-red-950/40 border border-red-800 text-red-400 text-xs px-3 py-2 rounded-lg">
          {assignmentError}
        </div>
      )}

      {showAdd && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchAssets(e.target.value);
              }}
              placeholder="Search available assets..."
              className="pl-8 bg-zinc-950 border-zinc-800 text-zinc-100 text-sm focus-visible:ring-purple-500 h-8"
            />
          </div>
          
          {searching && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            </div>
          )}
          
          {results.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {results.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleAssignClick(asset.id)}
                  disabled={assigning === asset.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 text-left transition-colors disabled:opacity-50"
                >
                  <Package className="w-3.5 h-3.5 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300 truncate">{asset.assetName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-zinc-600">{asset.assetNo || asset.id.slice(0, 8)}</p>
                      <Badge className={`${getStatusColor(asset.availabilityStatus)} text-[8px] px-1 py-0`}>
                        {asset.availabilityStatus}
                      </Badge>
                    </div>
                  </div>
                  {assigning === asset.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {results.length === 0 && search && !searching && (
            <p className="text-xs text-zinc-500 text-center py-2">No available assets found</p>
          )}
        </div>
      )}

      {/* Date Picker for Booking */}
      {showDatePicker && selectedAssetId && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">Booking Period</span>
            <button
              onClick={() => {
                setShowDatePicker(false);
                setSelectedAssetId(null);
              }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-zinc-500 block mb-1">Start Date</label>
              <input
                type="date"
                value={bookingDates.startDate}
                onChange={(e) => setBookingDates({ ...bookingDates, startDate: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-zinc-500 block mb-1">End Date</label>
              <input
                type="date"
                value={bookingDates.endDate}
                onChange={(e) => setBookingDates({ ...bookingDates, endDate: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs"
              onClick={() => assignAsset(selectedAssetId)}
              disabled={assigning === selectedAssetId}
            >
              {assigning === selectedAssetId ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Confirm Booking"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setShowDatePicker(false);
                setSelectedAssetId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Assigned Assets List */}
      <div className="space-y-2">
        {assets.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">No assets assigned.</p>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{asset.assetName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">{asset.assetNo || asset.id.slice(0, 8)}</span>
                    <Badge className={`${getStatusColor(asset.availabilityStatus)} text-[8px] px-1 py-0`}>
                      {asset.availabilityStatus}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={() => unassignAsset(asset.id)}
                disabled={unassigning === asset.id}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity p-1 disabled:opacity-50"
              >
                {unassigning === asset.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {assets.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>Total Assets: {assets.length}</span>
            <span>Status: {assets.filter(a => a.availabilityStatus === "IN_USE").length} in use</span>
          </div>
        </div>
      )}
    </div>
  );
}