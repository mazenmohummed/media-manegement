// app/dashboard/assets/[assetId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  Wrench,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Hash,
  Search,
  Link2,
  Unlink,
  X,
  Users,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AssetTask {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  endDate: string | null;
  project?: { id: string; name: string } | null;
}

interface Asset {
  id: string;
  assetNo: string | null;
  assetName: string;
  category: string;
  purchaseDate: string | null;
  currentValue: number;
  availabilityStatus: string;
  serialNumber: string | null;
  location: string | null;
  maintenanceDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: AssetTask[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  AVAILABLE: { label: "Available", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: CheckCircle2 },
  IN_USE: { label: "In Use", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: Clock },
  MAINTENANCE: { label: "Maintenance", color: "bg-amber-950/40 text-amber-400 border-amber-800", icon: Wrench },
  RETIRED: { label: "Retired", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: XCircle },
  LOST: { label: "Lost", color: "bg-red-950/40 text-red-400 border-red-800", icon: AlertCircle },
};

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskResults, setTaskResults] = useState<any[]>([]);
  const [searchingTasks, setSearchingTasks] = useState(false);
  const [assignmentError, setAssignmentError] = useState<{ message: string; conflicts?: any[] } | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data.asset);
      } else if (res.status === 404) {
        router.push("/dashboard/assets");
      }
    } catch (err) {
      console.error("Failed to load asset:", err);
    } finally {
      setLoading(false);
    }
  }, [assetId, router]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/assets");
      }
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  };

  const searchTasks = async (q: string) => {
    if (!q.trim()) {
      setTaskResults([]);
      return;
    }
    setSearchingTasks(true);
    try {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already assigned tasks
        const assignedTaskIds = new Set(asset?.tasks?.map(t => t.id) || []);
        setTaskResults((data.tasks || []).filter((t: any) => !assignedTaskIds.has(t.id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingTasks(false);
    }
  };

  const assignTask = async (taskId: string) => {
    setAssigningTaskId(taskId);
    setAssignmentError(null);
    
    try {
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (res.ok) {
        const data = await res.json();
        setAsset(data.asset);
        setShowAssign(false);
        setTaskSearch("");
        setTaskResults([]);
      } else {
        const error = await res.json();
        setAssignmentError({
          message: error.message || "Failed to assign task",
          conflicts: error.conflicts,
        });
      }
    } catch (err) {
      console.error("Failed to assign task:", err);
      setAssignmentError({ message: "Network error occurred" });
    } finally {
      setAssigningTaskId(null);
    }
  };

  const unassignTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}/assign?taskId=${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchAsset();
      }
    } catch (err) {
      console.error("Failed to unassign task:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-20">
        <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Asset not found.</p>
      </div>
    );
  }

  const status = statusConfig[asset.availabilityStatus] || statusConfig.AVAILABLE;
  const StatusIcon = status.icon;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/assets"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" /> Assets
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => router.push(`/dashboard/assets/${assetId}/edit`)}
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-800 text-red-400 hover:bg-red-950/40"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Asset Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-zinc-600">
                {asset.assetNo || asset.id.slice(0, 8)}
              </span>
              <Badge className={`${status.color} text-[10px] px-2 py-0.5`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-zinc-100">{asset.assetName}</h1>
            <p className="text-sm text-zinc-500">{asset.category}</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Current Value</p>
            <p className="text-lg font-bold text-purple-400">
              ${asset.currentValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/60">
          {asset.serialNumber && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                <Hash className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Serial Number</p>
                <p className="text-sm text-zinc-300">{asset.serialNumber}</p>
              </div>
            </div>
          )}

          {asset.location && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Location</p>
                <p className="text-sm text-zinc-300">{asset.location}</p>
              </div>
            </div>
          )}

          {asset.purchaseDate && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Purchase Date</p>
                <p className="text-sm text-zinc-300">
                  {new Date(asset.purchaseDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {asset.maintenanceDueAt && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Maintenance Due</p>
                <p className="text-sm text-zinc-300">
                  {new Date(asset.maintenanceDueAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Associated Tasks Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Associated Tasks ({asset.tasks?.length || 0})
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-700/60 text-purple-300 hover:bg-purple-950/40"
            onClick={() => {
              setShowAssign(!showAssign);
              setAssignmentError(null);
              setTaskSearch("");
              setTaskResults([]);
            }}
            disabled={asset.availabilityStatus === "MAINTENANCE" || asset.availabilityStatus === "RETIRED" || asset.availabilityStatus === "LOST"}
          >
            {showAssign ? <X className="w-3.5 h-3.5 mr-1.5" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
            {showAssign ? "Cancel" : "Assign Task"}
          </Button>
        </div>

        {/* Assignment Error */}
        {assignmentError && (
          <div className="bg-red-950/40 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Conflict Detected</p>
                <p className="text-xs mt-1">{assignmentError.message}</p>
              </div>
            </div>
            
            {assignmentError.conflicts && assignmentError.conflicts.length > 0 && (
              <div className="space-y-2 pl-6">
                <p className="text-xs font-medium text-zinc-400">Conflicting Tasks:</p>
                {assignmentError.conflicts.map((conflict) => (
                  <div key={conflict.taskId} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-300 font-medium">{conflict.taskTitle}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {conflict.taskNo && <span>{conflict.taskNo} · </span>}
                      {conflict.startDate && <span>Start: {new Date(conflict.startDate).toLocaleDateString()} · </span>}
                      {conflict.dueDate && <span>Due: {new Date(conflict.dueDate).toLocaleDateString()}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task Search */}
        {showAssign && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={taskSearch}
                onChange={(e) => {
                  setTaskSearch(e.target.value);
                  searchTasks(e.target.value);
                }}
                placeholder="Search tasks to assign..."
                className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>
            
            {searchingTasks && (
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching tasks...
              </p>
            )}
            
            {taskResults.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                {taskResults.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => assignTask(task.id)}
                    disabled={assigningTaskId === task.id}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 text-left transition-colors disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm text-zinc-300">{task.title || "Untitled Task"}</p>
                      <p className="text-[10px] text-zinc-600">
                        {task.taskNo || task.id.slice(0, 8)}
                        {task.dueDate && ` · Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                        {task.startDate && ` · Start: ${new Date(task.startDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    {assigningTaskId === task.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    ) : (
                      <Link2 className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task List */}
        {asset.tasks && asset.tasks.length > 0 ? (
          <div className="space-y-2">
            {asset.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg"
              >
                <Link
                  href={`/dashboard/tasks/${task.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm text-zinc-300 truncate">{task.title || "Untitled Task"}</p>
                  <p className="text-xs text-zinc-600">
                    {task.taskNo || task.id.slice(0, 8)}
                    {task.dueDate && ` · Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                    {task.startDate && ` · Start: ${new Date(task.startDate).toLocaleDateString()}`}
                    {task.project && ` · ${task.project.name}`}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                    {task.status}
                  </Badge>
                  <button
                    onClick={() => unassignTask(task.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                    title="Unassign task"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 text-center py-4">
            No tasks assigned to this asset yet.
          </p>
        )}
      </div>

      {/* Asset Usage Timeline */}
      {asset.tasks && asset.tasks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            Usage Timeline
          </h2>
          <div className="space-y-2">
            {asset.tasks
              .filter(t => t.startDate || t.endDate)
              .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime())
              .map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-2 bg-zinc-950/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{task.title || "Untitled Task"}</p>
                    <p className="text-[10px] text-zinc-500">
                      {task.startDate && new Date(task.startDate).toLocaleDateString()}
                      {task.endDate && ` → ${new Date(task.endDate).toLocaleDateString()}`}
                      {!task.endDate && ' (Ongoing)'}
                    </p>
                  </div>
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                    {task.status}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}