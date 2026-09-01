'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Upload,
  Plus,
  Lightbulb,
  Clock,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  Image,
  Video,
  Music,
  File,
  ExternalLink,
  Target,
  Users,
  MessageSquare,
  DollarSign,
  ListChecks,
  Globe,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BriefTab } from '@/components/projects/tabs/BriefTab';
import { ConceptCommentsTab } from '@/components/projects/tabs/ConceptCommentsTab';

interface CreativeBrief {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  objectives: string;
  audience: string | null;
  keyMessage: string | null;
  deliverables: string[];
  references: string[];
  createdAt: string;
  updatedAt: string;
}

interface AssetVersion {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: string;
  createdAt: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  versions: AssetVersion[];
  createdAt: string;
  updatedAt: string;
}

interface Concept {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets: Asset[];
  project?: {
    id: string;
    name: string;
    projectName: string;
    brief: CreativeBrief | null;
  };
  createdAt: string;
  updatedAt: string;
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  MOODBOARD: <Image className="w-4 h-4" />,
  STORYBOARD: <Image className="w-4 h-4" />,
  SCRIPT: <FileText className="w-4 h-4" />,
  COPY: <FileText className="w-4 h-4" />,
  MOCKUP: <Image className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  IMAGE: <Image className="w-4 h-4" />,
  AUDIO: <Music className="w-4 h-4" />,
  DOCUMENT: <File className="w-4 h-4" />,
  OTHER: <File className="w-4 h-4" />,
};

const assetTypeColors: Record<string, string> = {
  MOODBOARD: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  STORYBOARD: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SCRIPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  COPY: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  MOCKUP: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  VIDEO: 'bg-red-500/10 text-red-400 border-red-500/20',
  IMAGE: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  AUDIO: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  DOCUMENT: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function ConceptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const conceptId = params?.conceptId as string;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'brief' | 'assets' | 'comments'>('overview');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);

  const statusConfig: Record<Concept['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    DRAFT: {
      label: 'Draft',
      color: 'text-gray-400',
      bg: 'bg-gray-800/50 border-gray-700',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    IN_REVIEW: {
      label: 'In Review',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      icon: <Clock className="w-4 h-4" />,
    },
    APPROVED: {
      label: 'Approved',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    REJECTED: {
      label: 'Rejected',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      icon: <XCircle className="w-4 h-4" />,
    },
    ARCHIVED: {
      label: 'Archived',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50 border-zinc-700',
      icon: <Archive className="w-4 h-4" />,
    },
  };

  // ─── Fetch Concept ──────────────────────────────────────────────────────────
  const fetchConcept = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}?includeBrief=true`
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Concept not found');
          router.push(`/dashboard/projects/${projectId}?tab=concepts`);
          return;
        }
        throw new Error('Failed to fetch concept');
      }
      const data = await response.json();
      setConcept(data);
      setEditData({ name: data.name, description: data.description || '' });
    } catch (error) {
      console.error('Error fetching concept:', error);
      toast.error('Failed to load concept');
      router.push(`/dashboard/projects/${projectId}?tab=concepts`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || !conceptId) {
      toast.error('Invalid project or concept ID');
      router.push('/dashboard/projects');
      return;
    }
    fetchConcept();
  }, [projectId, conceptId]);

  // ─── Update Concept ────────────────────────────────────────────────────────
  const handleUpdateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.name.trim()) {
      toast.error('Concept name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editData.name.trim(),
            description: editData.description.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update concept');
      }

      const updated = await response.json();
      setConcept(updated);
      setIsEditing(false);
      toast.success('Concept updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update concept');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Concept ────────────────────────────────────────────────────────
  const handleDeleteConcept = async () => {
    if (!confirm('Are you sure you want to delete this concept? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete concept');
      }

      toast.success('Concept deleted successfully');
      router.push(`/dashboard/projects/${projectId}?tab=concepts`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete concept');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Update Status ─────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: Concept['status']) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await fetchConcept();
      toast.success(`Concept ${newStatus.replace('_', ' ').toLowerCase()} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  // ─── Delete Asset ──────────────────────────────────────────────────────────
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    setDeletingAsset(assetId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      setConcept(prev => {
        if (!prev) return null;
        return {
          ...prev,
          assets: prev.assets.filter(a => a.id !== assetId),
        };
      });
      toast.success('Asset deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
    } finally {
      setDeletingAsset(null);
    }
  };

  // ─── Get Status Actions ────────────────────────────────────────────────────
  const getStatusActions = () => {
    if (!concept) return [];

    const actions: { label: string; action: () => void; variant: 'primary' | 'success' | 'danger' | 'warning' | 'default' }[] = [];

    switch (concept.status) {
      case 'DRAFT':
        actions.push({
          label: 'Submit for Review',
          action: () => handleStatusChange('IN_REVIEW'),
          variant: 'primary',
        });
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange('ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'IN_REVIEW':
        actions.push({
          label: 'Approve',
          action: () => handleStatusChange('APPROVED'),
          variant: 'success',
        });
        actions.push({
          label: 'Reject',
          action: () => handleStatusChange('REJECTED'),
          variant: 'danger',
        });
        break;
      case 'APPROVED':
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange('ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'REJECTED':
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange('ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'ARCHIVED':
        actions.push({
          label: 'Restore',
          action: () => handleStatusChange('DRAFT'),
          variant: 'warning',
        });
        break;
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading concept...
        </div>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-zinc-100">Concept not found</h2>
        <p className="mt-2 text-zinc-500">The concept you're looking for doesn't exist.</p>
        <Link href={`/dashboard/projects/${projectId}?tab=concepts`}>
          <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Concepts
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[concept.status];
  const brief = concept?.project?.brief || null;
  const projectName = concept?.project?.projectName || concept?.project?.name || 'Project';
  const statusActions = getStatusActions();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/projects"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {projectName}
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}?tab=concepts`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Concepts
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-300 font-medium truncate max-w-[200px]">
          {concept.name}
        </span>
      </nav>

      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-zinc-100 truncate">
                {concept.name}
              </h1>
              <Badge className={`${status.bg} border font-mono ${status.color}`}>
                <span className="flex items-center gap-1.5">
                  {status.icon}
                  {status.label}
                </span>
              </Badge>
            </div>
            {concept.description && (
              <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">
                {concept.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-500">
              <span>Created: {format(new Date(concept.createdAt), 'PPP')}</span>
              <span>Updated: {format(new Date(concept.updatedAt), 'PPP')}</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {concept.assets.length} assets
              </span>
              {brief && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Brief available
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {statusActions.map((action, idx) => {
              const variantStyles = {
                primary: 'bg-blue-600 hover:bg-blue-700 text-white',
                success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                danger: 'bg-red-600 hover:bg-red-700 text-white',
                warning: 'bg-amber-600 hover:bg-amber-700 text-white',
                default: 'border-zinc-700 text-zinc-300 hover:bg-zinc-800',
              };
              return (
                <Button
                  key={idx}
                  onClick={action.action}
                  size="sm"
                  className={variantStyles[action.variant]}
                >
                  {action.label}
                </Button>
              );
            })}
            
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              onClick={handleDeleteConcept}
              disabled={isDeleting}
              size="sm"
              variant="outline"
              className="border-red-800/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* ─── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'brief'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Brief
            {!brief && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] ml-1">
                Missing
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'assets'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Assets ({concept.assets.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'comments'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Comments
          </button>
        </div>
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────────── */}

      {/* ─── Overview Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Concept Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Concept Details Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Concept Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500">Name</p>
                  <p className="text-sm text-zinc-200 font-medium">{concept.name}</p>
                </div>
                {concept.description && (
                  <div>
                    <p className="text-xs text-zinc-500">Description</p>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{concept.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-500">Status</p>
                    <Badge className={`${status.bg} border font-mono ${status.color} mt-1`}>
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Assets</p>
                    <p className="text-sm text-zinc-200">{concept.assets.length} uploaded</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-blue-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href={`/dashboard/projects/${projectId}/concepts/${conceptId}/edit`}>
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Concept
                  </Button>
                </Link>
                <Link href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/new`}>
                  <Button variant="outline" className="w-full border-blue-600/30 text-blue-400 hover:bg-blue-950/20">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Asset
                  </Button>
                </Link>
                
                {/* ─── Status-based Actions ────────────────────────────────── */}
                {concept.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange('IN_REVIEW')}
                    className="col-span-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Submit for Review
                  </button>
                )}
                {concept.status === 'IN_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('APPROVED')}
                      className="col-span-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange('REJECTED')}
                      className="col-span-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4 inline mr-2" />
                      Reject
                    </button>
                    <div className="col-span-2 px-4 py-2 text-sm text-yellow-400 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
                      <Clock className="w-4 h-4 inline mr-2" />
                      In review - Only Team Leaders and Admins can approve/reject
                    </div>
                  </>
                )}
                {concept.status === 'APPROVED' && (
                  <>
                    <div className="col-span-2 px-4 py-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      ✓ This concept has been approved
                    </div>
                    <button
                      onClick={() => handleStatusChange('ARCHIVED')}
                      className="col-span-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                    >
                      <Archive className="w-4 h-4 inline mr-2" />
                      Archive Concept
                    </button>
                  </>
                )}
                {concept.status === 'REJECTED' && (
                  <>
                    <div className="col-span-2 px-4 py-2 text-sm text-red-400 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                      <XCircle className="w-4 h-4 inline mr-2" />
                      ✗ This concept has been rejected
                    </div>
                    <button
                      onClick={() => handleStatusChange('ARCHIVED')}
                      className="col-span-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                    >
                      <Archive className="w-4 h-4 inline mr-2" />
                      Archive Concept
                    </button>
                  </>
                )}
                {concept.status === 'ARCHIVED' && (
                  <>
                    <div className="col-span-2 px-4 py-2 text-sm text-zinc-400 bg-zinc-500/10 rounded-lg border border-zinc-500/20 text-center">
                      <Archive className="w-4 h-4 inline mr-2" />
                      📦 This concept has been archived
                    </div>
                    <button
                      onClick={() => handleStatusChange('DRAFT')}
                      className="col-span-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" />
                      Restore Concept
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
                  <Edit className="w-4 h-4 text-blue-400" />
                  Edit Concept
                </h2>
                <form onSubmit={handleUpdateConcept} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Concept Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="bg-zinc-950/60 border-zinc-800 text-zinc-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Description
                    </label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={4}
                      className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({ name: concept.name, description: concept.description || '' });
                      }}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Save className="w-4 h-4 mr-1.5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right Column - Brief Summary */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-emerald-400" />
                Brief Summary
              </h2>
              {brief ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-500">Project</p>
                    <p className="text-sm text-zinc-200 font-medium">
                      {concept?.project?.projectName || concept?.project?.name || 'Unknown Project'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Brief Title</p>
                    <p className="text-sm text-zinc-200">{brief.title}</p>
                  </div>
                  {brief.budget && (
                    <div>
                      <p className="text-xs text-zinc-500">Budget</p>
                      <p className="text-sm text-zinc-200">${brief.budget.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-zinc-500">Status</p>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {brief.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setActiveTab('brief')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                  >
                    View Full Brief
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-10 w-10 text-zinc-600" />
                  <p className="mt-2 text-sm text-zinc-400">No creative brief found</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Ask your project manager to create a brief
                  </p>
                  <button
                    onClick={() => setActiveTab('brief')}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                  >
                    Create Brief →
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-xs font-semibold text-zinc-400 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Assets</span>
                  <span className="text-zinc-200 font-medium">{concept.assets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className={`font-medium ${status.color}`}>{status.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Brief</span>
                  <span className={brief ? 'text-emerald-400' : 'text-amber-400'}>
                    {brief ? 'Available' : 'Missing'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Updated</span>
                  <span className="text-zinc-400 text-xs">
                    {format(new Date(concept.updatedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Brief Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'brief' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <BriefTab projectId={projectId} currency={concept?.project?.brief?.budget ? 'USD' : 'EGP'} />
        </div>
      )}

      {/* ─── Assets Tab ──────────────────────────────────────────────────────── */}
{activeTab === 'assets' && (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
        <Image className="w-4 h-4 text-blue-400" />
        Creative Assets
        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono text-[9px] ml-1">
          {concept.assets.length}
        </Badge>
      </h2>
      <Link href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/new`}>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Asset
        </Button>
      </Link>
    </div>

    {concept.assets.length === 0 ? (
      <div className="text-center py-12 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
        <Upload className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-400">No assets uploaded yet</p>
        <p className="text-xs text-zinc-500 mt-0.5">Add creative assets to this concept</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {concept.assets.map((asset) => {
          const latestVersion = asset.versions[0];
          const assetIcon = assetTypeIcons[asset.type] || <File className="w-4 h-4" />;
          const assetColor = assetTypeColors[asset.type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
          
          return (
            <Link
              href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/${asset.id}`}
              key={asset.id}
              className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${assetColor}`}>
                      {assetIcon}
                    </span>
                    <h4 className="font-medium text-zinc-200 truncate">
                      {asset.name}
                    </h4>
                  </div>
                  <Badge className={`mt-1.5 text-[9px] ${assetColor}`}>
                    {asset.type.replace('_', ' ')}
                  </Badge>
                </div>
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] font-mono shrink-0 ml-2">
                  v{asset.versions.length}
                </Badge>
              </div>
              
              {latestVersion && (
                <div className="mt-3 flex items-center gap-3 pt-3 border-t border-zinc-800/60">
                  <a
                    href={latestVersion.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                  <span className="text-zinc-700">•</span>
                  <span className="text-[10px] text-zinc-500">
                    v{latestVersion.versionNo}
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-[10px] text-zinc-500">
                    {format(new Date(latestVersion.createdAt), 'MMM d, yyyy')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteAsset(asset.id);
                    }}
                    disabled={deletingAsset === asset.id}
                    className="ml-auto text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deletingAsset === asset.id ? '...' : 'Delete'}
                  </button>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    )}
  </div>
)}

      {/* ─── Comments Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'comments' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ConceptCommentsTab projectId={projectId} conceptId={conceptId} />
        </div>
      )}
    </div>
  );
}