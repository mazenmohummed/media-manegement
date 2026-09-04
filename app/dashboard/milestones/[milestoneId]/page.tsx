// app/dashboard/milestones/[milestoneId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Milestone,
  Folder,
  TrendingUp,
  Edit3,
  Save,
  Trash2,
  Loader2,
  Plus,
  Target,
  BarChart3,
  ChevronRight,
  Users,
  Tag,
  Lightbulb,
  MessageSquare,
  GitBranch,
  Link2,
  Unlink,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

type StatusConfig = Record<string, { label: string; color: string; icon: React.ReactNode }>;

const statusConfig: StatusConfig = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: <Clock className="w-3 h-3" /> },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: <TrendingUp className="w-3 h-3" /> },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800", icon: <XCircle className="w-3 h-3" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  MEDIUM: { label: "Medium", color: "bg-blue-950/30 text-blue-400 border-blue-800" },
  HIGH: { label: "High", color: "bg-orange-950/30 text-orange-400 border-orange-800" },
  URGENT: { label: "Urgent", color: "bg-red-950/30 text-red-400 border-red-800" },
};

interface TaskItem {
  id: string;
  taskNo: string | null;
  title: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  assignees: { id: string; name: string; avatarUrl: string | null }[];
  category: { id: string; name: string } | null;
  _count: { comments: number; todos: number };
}

interface ConceptItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assets: { id: string }[];
  createdAt: string;
  taskId: string | null;
  milestoneId: string | null;
}

interface AvailableConcept {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assetCount: number;
  hasActiveReview: boolean;
  linkedTask: { id: string; title: string } | null;
  linkedMilestone: { id: string; name: string } | null;
  createdAt: string;
}

interface ReviewItem {
  id: string;
  reviewLinkStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  overallStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED' | 'PARTIALLY_APPROVED';
  isActive: boolean;
  reviewedAt: string | null;
  reviewerName: string | null;
  createdAt: string;
  conceptName: string;
  conceptId: string;
  reviewNotes: string | null;
  assetApprovals: {
    id: string;
    status: string;
    feedback: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
  }[];
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

interface MilestoneDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  order: number;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  project: { id: string; name: string; projectNo: string | null } | null;
  tasks: TaskItem[];
  concepts: ConceptItem[];
  reviews: ReviewItem[];
  reviewStats: {
    total: number;
    active: number;
    completed: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Get the status display config for reviews
const getReviewStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    APPROVED: {
      label: 'Approved',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    REVISIONS_REQUIRED: {
      label: 'Revisions Needed',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    PARTIALLY_APPROVED: {
      label: 'Partially Approved',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    PENDING: {
      label: 'Pending',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
  };
  return configs[status] || configs.PENDING;
};

export default function MilestoneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const milestoneId = params?.milestoneId as string;

  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Link existing concept state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [availableConcepts, setAvailableConcepts] = useState<AvailableConcept[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const fetchMilestone = useCallback(async () => {
    if (!milestoneId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Milestone not found");
          router.push("/dashboard/milestones");
          return;
        }
        throw new Error(`Failed to fetch milestone: ${res.status}`);
      }
      const data = await res.json();
      setMilestone(data.milestone || data);
      setEditName(data.milestone?.name || data.name || "");
      setEditDescription(data.milestone?.description || data.description || "");
    } catch (err) {
      console.error("Failed to load milestone:", err);
      toast.error("Failed to load milestone");
    } finally {
      setLoading(false);
    }
  }, [milestoneId, router]);

  useEffect(() => {
    fetchMilestone();
  }, [fetchMilestone]);

  const updateMilestone = async (updates: Partial<MilestoneDetail>) => {
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setMilestone(data.milestone || data);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Update failed:", err);
      return false;
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const ok = await updateMilestone({ name: editName, description: editDescription });
    if (ok) {
      setEditing(false);
      toast.success("Milestone updated");
    } else {
      toast.error("Failed to update milestone");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Milestone deleted");
        router.push("/dashboard/milestones");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete milestone");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete milestone");
    } finally {
      setDeleting(false);
    }
  };

// ─── Link Existing Concept Functions ──────────────────────────────────────

// Fetch available concepts for linking
// In the milestone detail page - temporarily modify for debugging

const fetchAvailableConcepts = async () => {
  if (!milestone?.project?.id) {
    toast.error("No project associated with this milestone");
    return;
  }

  setLoadingAvailable(true);
  try {
    // ✅ Fetch ALL concepts in the project (ignore available filter)
    const url = `/api/projects/${milestone.project.id}/concepts`;
    console.log('Fetching all concepts from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      throw new Error(errorData.error || 'Failed to fetch concepts');
    }
    
    const data = await response.json();
    console.log('All concepts response:', data);
    
    let allConcepts: AvailableConcept[] = [];
    if (Array.isArray(data)) {
      allConcepts = data;
    } else if (data.concepts && Array.isArray(data.concepts)) {
      allConcepts = data.concepts;
    } else if (data.data && Array.isArray(data.data)) {
      allConcepts = data.data;
    }
    
    console.log('All concepts list:', allConcepts);
    
    // 🔍 Show ALL concepts for debugging
    allConcepts.forEach((concept: any) => {
      console.log(`Concept "${concept.name}" (${concept.id}):`, {
        taskId: concept.linkedTask?.id || null,
        taskMilestoneId: concept.linkedTask?.milestoneId || null,
        milestoneId: concept.linkedMilestone?.id || null,
        isLinked: concept.linkedTask?.id || concept.linkedMilestone?.id ? 'YES' : 'NO',
      });
    });
    
    // ✅ Show ALL concepts (no filtering) for debugging
    setAvailableConcepts(allConcepts);
    
  } catch (error) {
    console.error('Error fetching available concepts:', error);
    toast.error('Failed to load available concepts');
  } finally {
    setLoadingAvailable(false);
  }
};

  // Open link dialog
  const openLinkDialog = () => {
    setShowLinkDialog(true);
    fetchAvailableConcepts();
  };

  // Link concept to milestone
  const handleLinkConcept = async (conceptId: string) => {
    setLinking(conceptId);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link concept');
      }

      toast.success('Concept linked successfully!');
      setShowLinkDialog(false);
      fetchMilestone(); // Refresh milestone data
    } catch (error: any) {
      toast.error(error.message || 'Failed to link concept');
    } finally {
      setLinking(null);
    }
  };

  // Unlink concept from milestone
  const handleUnlinkConcept = async (conceptId: string) => {
    if (!confirm('Remove this concept from the milestone? It will remain available in the project.')) return;

    setUnlinking(conceptId);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink concept');
      }

      toast.success('Concept unlinked from milestone');
      fetchMilestone(); // Refresh milestone data
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink concept');
    } finally {
      setUnlinking(null);
    }
  };

  // Filter available concepts for linking
  const filteredAvailable = availableConcepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                         concept.description?.toLowerCase().includes(linkSearchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center py-20">
        <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Milestone not found.</p>
      </div>
    );
  }

  const status = statusConfig[milestone.status] || statusConfig.PENDING;
  const isOverdue = milestone.deadline && new Date(milestone.deadline) < new Date() && milestone.status !== "COMPLETED";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/milestones"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Milestones
        </Link>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => setEditing(true)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setEditName(milestone.name);
                setEditDescription(milestone.description || "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-red-900 text-red-400 hover:bg-red-950/30"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
            Delete
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
                {status.icon}
                {status.label}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-950/30 text-red-400 border-red-800 text-[10px] px-1.5 py-0">
                  Overdue
                </Badge>
              )}
              {milestone.project && (
                <Link
                  href={`/dashboard/projects/${milestone.project.id}`}
                  className="text-[10px] text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                >
                  <Folder className="w-3 h-3" />
                  {milestone.project.name}
                </Link>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-lg font-bold text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                />
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-zinc-100">{milestone.name}</h1>
                {milestone.description && (
                  <p className="text-sm text-zinc-400">{milestone.description}</p>
                )}
              </>
            )}
          </div>

          {/* Progress Circle */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-purple-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${milestone.progress}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-zinc-200">{milestone.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300">{milestone.completedTasks}/{milestone.totalTasks} tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-zinc-300">{milestone.concepts?.length || 0} concepts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-zinc-300">{milestone.reviews?.length || 0} reviews</span>
          </div>
          {milestone.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span className={isOverdue ? "text-red-400" : ""}>
                Due {new Date(milestone.deadline).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span>Updated {new Date(milestone.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Status & Deadline Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Status</h3>
          <select
            value={milestone.status}
            onChange={(e) => updateMilestone({ status: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Deadline</h3>
          <input
            type="datetime-local"
            value={milestone.deadline ? new Date(milestone.deadline).toISOString().slice(0, 16) : ""}
            onChange={(e) => updateMilestone({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Order</h3>
          <input
            type="number"
            value={milestone.order}
            onChange={(e) => updateMilestone({ order: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-zinc-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tasks ({milestone.totalTasks})
          </TabsTrigger>
          <TabsTrigger value="concepts" className="data-[state=active]:bg-zinc-800">
            <Lightbulb className="w-4 h-4 mr-2" />
            Concepts ({milestone.concepts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-zinc-800">
            <MessageSquare className="w-4 h-4 mr-2" />
            Reviews ({milestone.reviews?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Tasks
              </h2>
              <Link
                href={`/dashboard/tasks/new?projectId=${milestone.project?.id}&milestoneId=${milestone.id}`}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
              >
                <Plus className="w-4 h-4" /> Add Task
              </Link>
            </div>

            {milestone.tasks.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-medium">No tasks yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Add a task to start tracking progress.</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {milestone.tasks.map((task, idx) => (
                  <TaskRow key={task.id} task={task} isLast={idx === milestone.tasks.length - 1} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Concepts Tab with Link Existing */}
        <TabsContent value="concepts">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Concepts
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={openLinkDialog}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Existing
                </Button>
                <Link
                  href={`/dashboard/concepts/new?milestoneId=${milestone.id}`}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Concept
                </Link>
              </div>
            </div>

            {!milestone.concepts || milestone.concepts.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <Lightbulb className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-medium">No concepts yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Create a new concept or link an existing one from the project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {milestone.concepts.map((concept) => (
                  <div
                    key={concept.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/dashboard/concepts/${concept.id}`}
                        className="flex-1 min-w-0"
                      >
                        <h3 className="font-medium text-zinc-200 group-hover:text-zinc-100">
                          {concept.name}
                        </h3>
                        {concept.description && (
                          <p className="text-sm text-zinc-400 line-clamp-2">{concept.description}</p>
                        )}
                      </Link>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge className={`text-[9px] ${
                          concept.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : concept.status === 'IN_REVIEW'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {concept.status}
                        </Badge>
                        <Button
                          onClick={() => handleUnlinkConcept(concept.id)}
                          disabled={unlinking === concept.id}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          title="Unlink from milestone"
                        >
                          {unlinking === concept.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unlink className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-3">
                      <span>{concept.assets?.length || 0} assets</span>
                      <span>•</span>
                      <span>{new Date(concept.createdAt).toLocaleDateString()}</span>
                      {concept.taskId && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400">Linked to task</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Reviews
                {milestone.reviewStats && (
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    {milestone.reviewStats.total} reviews
                  </Badge>
                )}
              </h2>
            </div>

            {!milestone.reviews || milestone.reviews.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 font-medium">No reviews yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Reviews will appear when concepts are sent to clients.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {milestone.reviews.map((review) => {
                  const statusConfig = getReviewStatusConfig(review.overallStatus);
                  return (
                    <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                          {review.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px]">
                              Inactive
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-500">
                            {review.conceptName}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : 'Pending'}
                        </span>
                      </div>
                      
                      {review.reviewerName && (
                        <p className="text-sm text-zinc-400 mt-2">
                          Reviewed by: {review.reviewerName}
                        </p>
                      )}
                      
                      {review.summary && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className="text-emerald-400">{review.summary.approved} approved</span>
                          <span className="text-amber-400">{review.summary.rejected} revisions</span>
                          <span className="text-blue-400">{review.summary.pending} pending</span>
                          <span>• {review.summary.total} total</span>
                        </div>
                      )}

                      {review.reviewNotes && (
                        <div className="mt-2 p-2 bg-zinc-800/30 rounded-lg">
                          <p className="text-xs text-zinc-400 line-clamp-2">{review.reviewNotes}</p>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-zinc-500">
                        Created: {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Link Existing Concept Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Link Existing Concept
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search concepts..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500"
              />
            </div>

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">
                  {availableConcepts.length === 0 
                    ? 'No available concepts in this project'
                    : 'No concepts match your search'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {availableConcepts.length === 0 
                    ? 'All concepts are already linked to this milestone or tasks, or none exist'
                    : 'Try adjusting your search'}
                </p>
                {availableConcepts.length === 0 && (
                  <div className="mt-4 text-xs text-zinc-500 space-y-1">
                    <p>Debug info:</p>
                    <p>Project ID: {milestone?.project?.id}</p>
                    <p>Milestone ID: {milestoneId}</p>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/projects/${milestone?.project?.id}/concepts`);
                        const data = await res.json();
                        console.log('All concepts:', data);
                        const count = data.concepts?.length || data.data?.length || 0;
                        alert(`Found ${count} concepts in project. Check console for details.`);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Click to check concepts in project
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {filteredAvailable.map((concept) => (
                  <div
                    key={concept.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-200 truncate">{concept.name}</h4>
                        <Badge className={`text-[9px] ${
                          concept.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : concept.status === 'IN_REVIEW'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {concept.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{concept.assetCount} assets</span>
                        <span>•</span>
                        <span>{new Date(concept.createdAt).toLocaleDateString()}</span>
                        {concept.linkedTask && (
                          <span className="text-blue-400">Task: {concept.linkedTask.title}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLinkConcept(concept.id)}
                      disabled={linking === concept.id}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                    >
                      {linking === concept.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          Link
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowLinkDialog(false)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskRow({ task, isLast }: { task: TaskItem; isLast: boolean }) {
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${
        !isLast ? "border-b border-zinc-800/60" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge className={`${priority.color} text-[10px] px-1.5 py-0 shrink-0`}>
          {priority.label}
        </Badge>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
            {task.title ?? "Untitled Task"}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{task.taskNo ?? task.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <Badge className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
          {status.icon}
          {status.label}
        </Badge>
        {task.category && (
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
            <Tag className="w-2.5 h-2.5 mr-0.5" />
            {task.category.name}
          </Badge>
        )}
      </div>

      <div className="hidden md:flex items-center gap-3 w-32 shrink-0">
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{task.progress}%</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0 w-28">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 2).map((a) => (
            <div
              key={a.id}
              className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400"
              title={a.name}
            >
              {a.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 2 && (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-500">
              +{task.assignees.length - 2}
            </div>
          )}
        </div>
        {task.assignees.length === 0 && <span className="text-[10px] text-zinc-600">—</span>}
      </div>

      <div className="hidden md:block text-[10px] text-zinc-500 shrink-0 w-24 text-right">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
    </Link>
  );
}