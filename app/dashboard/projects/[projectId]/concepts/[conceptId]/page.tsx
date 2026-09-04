// app/dashboard/projects/[projectId]/concepts/[conceptId]/page.tsx
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
  Link as LinkIcon,
  Copy,
  User,
  Mail,
  Briefcase,
  Calendar,
  GitBranch,
  Folder,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConceptCommentsTab } from '@/components/projects/tabs/ConceptCommentsTab';
import { ConceptBriefEditor } from '@/components/concepts/ConceptBriefEditor';

// ============================================
// TYPES
// ============================================

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

interface Milestone {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface Project {
  id: string;
  name: string;
  projectName: string;
  clientName: string;
}

interface Concept {
  id: string;
  name: string;
  description: string | null;
  brief: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets: Asset[];
  projectId: string;
  agencyId: string;
  taskId: string | null;
  milestoneId: string | null;
  task?: Task | null;
  milestone?: Milestone | null;
  project?: Project | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMPONENT
// ============================================

export default function ConceptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const conceptId = params?.conceptId as string;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'brief' | 'assets' | 'reviews' | 'comments'>('overview');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    name: '', 
    description: '', 
    brief: '' 
  });
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);

  // Client review link states
  const [creatingReviewLink, setCreatingReviewLink] = useState(false);
  const [showReviewLinkModal, setShowReviewLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [linkDetails, setLinkDetails] = useState<{
    conceptName: string;
    assetCount: number;
    clientName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Review history state
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewHistory, setShowReviewHistory] = useState(true);

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
        `/api/projects/${projectId}/concepts/${conceptId}`
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
      setEditData({ 
        name: data.name, 
        description: data.description || '', 
        brief: data.brief || '' 
      });
    } catch (error) {
      console.error('Error fetching concept:', error);
      toast.error('Failed to load concept');
      router.push(`/dashboard/projects/${projectId}?tab=concepts`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Review History ──────────────────────────────────────────────────
  const fetchReviewHistory = async () => {
    setLoadingReviews(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/reviews`
      );
      if (response.ok) {
        const data = await response.json();
        setReviewHistory(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching review history:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (!projectId || !conceptId) {
      toast.error('Invalid project or concept ID');
      router.push('/dashboard/projects');
      return;
    }
    fetchConcept();
    fetchReviewHistory();
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
            brief: editData.brief.trim() || undefined,
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

  // ─── Send for Client Review ──────────────────────────────────────────────
  const handleSendForClientReview = async () => {
    if (!concept) {
      console.warn('No concept available');
      return;
    }

    setCreatingReviewLink(true);
    try {
      if (concept.assets.length === 0) {
        toast.error('Please add at least one asset before sending for review.');
        setCreatingReviewLink(false);
        return;
      }

      // Get concept with client info
      const conceptResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}`
      );
      if (!conceptResponse.ok) {
        const errorData = await conceptResponse.json();
        throw new Error(errorData.error || 'Failed to fetch concept details');
      }
      const conceptData = await conceptResponse.json();

      if (!conceptData.clientId) {
        toast.error(
          'This concept is not associated with a client. ' +
          'Please ensure the project has a client assigned before creating a review link.'
        );
        setCreatingReviewLink(false);
        return;
      }

      const response = await fetch('/api/client-review/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: conceptId,
          clientId: conceptData.clientId,
          expiresInDays: 14,
          maxViews: 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review link');
      }

      const data = await response.json();
      
      const url = data.url;
      const expiresAt = data.expiresAt || null;
      const conceptName = data.concept?.name || concept.name;
      const assetCount = data.concept?.assetCount || concept.assets.length;
      const clientName = conceptData.clientName || conceptData.client?.clientName || 'Client';
      
      setGeneratedLink(url);
      setLinkExpiry(expiresAt);
      setLinkDetails({
        conceptName: conceptName,
        assetCount: assetCount,
        clientName: clientName,
      });
      
      setShowReviewLinkModal(true);
      
      try {
        await navigator.clipboard.writeText(url);
        toast.success('✅ Review link copied to clipboard!');
      } catch (clipError) {
        console.warn('Could not copy to clipboard:', clipError);
      }
      
    } catch (error: any) {
      console.error('Error creating review link:', error);
      toast.error(error.message || 'Failed to create review link');
    } finally {
      setCreatingReviewLink(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        toast.success('✅ Review link copied to clipboard!', {
          duration: 3000,
          position: 'top-center',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = generatedLink;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopied(true);
          toast.success('✅ Review link copied to clipboard!', {
            duration: 3000,
            position: 'top-center',
          });
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          toast.error('Failed to copy link. Please copy it manually.', {
            duration: 4000,
            position: 'top-center',
          });
        }
      }
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
              {/* Show linked project */}
              {concept.project && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  <Folder className="w-3 h-3 mr-1" />
                  {concept.project.projectName || concept.project.name}
                </Badge>
              )}
              {/* Show linked task if present */}
              {concept.task && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Task: {concept.task.title}
                </Badge>
              )}
              {/* Show linked milestone if present */}
              {concept.milestone && (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                  <GitBranch className="w-3 h-3 mr-1" />
                  Milestone: {concept.milestone.name}
                </Badge>
              )}
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
  {/* ✅ Brief status indicator with quick add button */}
  {concept.brief ? (
    <span className="flex items-center gap-1 text-emerald-400">
      <CheckCircle className="w-3.5 h-3.5" />
      Brief available
    </span>
  ) : (
    <span className="flex items-center gap-1 text-amber-400">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>No brief</span>
      <button
        onClick={() => {
          setIsEditing(true);
          setActiveTab('overview');
        }}
        className="text-emerald-400 hover:text-emerald-300 underline ml-1"
      >
        Add brief
      </button>
    </span>
  )}
</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={handleSendForClientReview}
              disabled={creatingReviewLink || concept.assets.length === 0}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {creatingReviewLink ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Send for Client Review
                </>
              )}
            </Button>

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
            {!concept.brief && (
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
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reviews ({reviewHistory.length})
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
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500">Name</p>
                  <p className="text-sm text-zinc-200 font-medium">{concept.name}</p>
                </div>
                
                {/* ✅ Show Project */}
                <div>
                  <p className="text-xs text-zinc-500">Project</p>
                  <Link 
                    href={`/dashboard/projects/${concept.projectId}`}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Folder className="w-4 h-4" />
                    {concept.project?.projectName || concept.project?.name || 'Unknown Project'}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* ✅ Show Milestone if linked */}
                {concept.milestone && (
                  <div>
                    <p className="text-xs text-zinc-500">Milestone</p>
                    <Link 
                      href={`/dashboard/milestones/${concept.milestone.id}`}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <GitBranch className="w-4 h-4" />
                      {concept.milestone.name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* ✅ Show Task if linked */}
                {concept.task && (
                  <div>
                    <p className="text-xs text-zinc-500">Task</p>
                    <Link 
                      href={`/dashboard/tasks/${concept.task.id}`}
                      className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Briefcase className="w-4 h-4" />
                      {concept.task.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {concept.description && (
                  <div>
                    <p className="text-xs text-zinc-500">Description</p>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{concept.description}</p>
                  </div>
                )}
                {concept.brief && (
                  <div>
                    <p className="text-xs text-zinc-500">Brief</p>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap line-clamp-3">{concept.brief}</p>
                    <button
                      onClick={() => setActiveTab('brief')}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      Read more →
                    </button>
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
          rows={3}
          className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-zinc-300">
            Brief <span className="text-zinc-500 text-[10px]">(Creative brief for this concept)</span>
          </label>
          {!editData.brief && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Add brief
            </span>
          )}
        </div>
        <Textarea
          value={editData.brief}
          onChange={(e) => setEditData({ ...editData, brief: e.target.value })}
          rows={5}
          placeholder="Enter the creative brief for this concept..."
          className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setEditData({ 
              name: concept.name, 
              description: concept.description || '', 
              brief: concept.brief || '' 
            });
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
              <ConceptBriefEditor
                conceptId={conceptId}
                projectId={projectId}
                initialBrief={concept.brief}
                onUpdate={fetchConcept}
              />
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
                  <span className={concept.brief ? 'text-emerald-400' : 'text-amber-400'}>
                    {concept.brief ? 'Available' : 'Missing'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Reviews</span>
                  <span className="text-zinc-200 font-medium">{reviewHistory.length}</span>
                </div>
                <div className="flex justify-between">
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
{activeTab === 'brief' && (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
        <FileText className="w-4 h-4 text-emerald-400" />
        Creative Brief
      </h2>
      {/* ✅ Add Brief button when no brief exists */}
      {!concept.brief && (
        <Button
          onClick={() => {
            setIsEditing(true);
            setActiveTab('overview');
          }}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Brief
        </Button>
      )}
    </div>
    
    {concept.brief ? (
      <div className="prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed bg-zinc-950/40 rounded-lg p-4 border border-zinc-800">
          {concept.brief}
        </div>
      </div>
    ) : (
      <div className="text-center py-12 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-700">
        <FileText className="mx-auto h-12 w-12 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-400">No creative brief yet</p>
        <p className="text-xs text-zinc-500 mt-1">
          Define the creative direction and requirements for this concept
        </p>
        <Button
          onClick={() => {
            setIsEditing(true);
            setActiveTab('overview');
          }}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Brief
        </Button>
      </div>
    )}
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
                return (
                  <Link
                    href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/${asset.id}`}
                    key={asset.id}
                    className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-zinc-200 truncate">{asset.name}</h4>
                        <Badge className="mt-1 text-[9px] bg-zinc-800 text-zinc-400 border-zinc-700">
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
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Reviews Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Review History
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono text-[9px] ml-1">
                {reviewHistory.length}
              </Badge>
            </h2>
            <button
              onClick={() => setShowReviewHistory(!showReviewHistory)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showReviewHistory ? 'Hide' : 'Show'} All Reviews
            </button>
          </div>

          {loadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
              <span className="ml-2 text-xs text-zinc-500">Loading reviews...</span>
            </div>
          ) : reviewHistory.length === 0 ? (
            <div className="text-center py-12 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
              <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400">No reviews yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Send this concept to your client for review
              </p>
              <Button
                onClick={handleSendForClientReview}
                disabled={creatingReviewLink || concept.assets.length === 0}
                size="sm"
                className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {creatingReviewLink ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Send for Client Review
                  </>
                )}
              </Button>
            </div>
          ) : showReviewHistory ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {reviewHistory.map((review: any, index: number) => {
                const isClientReview = review.type === 'CLIENT_REVIEW' || review.source === 'review_link';
                
                let conceptFeedback = null;
                if (review.reviewNotes) {
                  try {
                    const parsed = JSON.parse(review.reviewNotes);
                    if (parsed.overview || parsed.brief || parsed.overall) {
                      conceptFeedback = parsed;
                    }
                  } catch {
                    conceptFeedback = { overall: review.reviewNotes };
                  }
                }

                return (
                  <div
                    key={review.id || index}
                    className={`border rounded-lg p-4 transition-colors ${
                      review.status === 'APPROVED' 
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : review.status === 'REJECTED' || review.status === 'REVISIONS_REQUIRED'
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-zinc-700/50 bg-zinc-800/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] ${
                            isClientReview 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {isClientReview ? 'Client Review' : 'Internal Review'}
                          </Badge>
                          
                          <Badge className={`text-[10px] ${
                            review.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : review.status === 'REJECTED' || review.status === 'REVISIONS_REQUIRED'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {review.status?.replace('_', ' ')}
                          </Badge>
                          
                          <span className="text-[10px] text-zinc-500">
                            {format(new Date(review.createdAt || review.reviewedAt), 'PPP p')}
                          </span>
                        </div>

                        {conceptFeedback && (
                          <div className="space-y-2 mt-2">
                            {conceptFeedback.overview && (
                              <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                <p className="text-xs text-blue-400 font-medium">Overview Feedback:</p>
                                <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">
                                  {conceptFeedback.overview}
                                </p>
                              </div>
                            )}
                            {conceptFeedback.brief && (
                              <div className="p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                                <p className="text-xs text-purple-400 font-medium">Brief Feedback:</p>
                                <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">
                                  {conceptFeedback.brief}
                                </p>
                              </div>
                            )}
                            {conceptFeedback.overall && (
                              <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                <p className="text-xs text-emerald-400 font-medium">Overall Feedback:</p>
                                <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">
                                  {conceptFeedback.overall}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {review.assetApprovals && review.assetApprovals.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-zinc-400 font-medium mb-1">Asset Feedback:</p>
                            <div className="space-y-1.5">
                              {review.assetApprovals.map((approval: any) => (
                                <div key={approval.assetId} className="text-xs text-zinc-400 pl-2 border-l-2 border-zinc-700">
                                  <span className="text-zinc-300 font-medium">{approval.assetName}:</span>
                                  <span className={`ml-2 ${
                                    approval.status === 'APPROVED' ? 'text-emerald-400' : 
                                    approval.status === 'REJECTED' || approval.status === 'REVISIONS_REQUESTED' ? 'text-red-400' : 
                                    'text-amber-400'
                                  }`}>
                                    {approval.status?.replace('_', ' ')}
                                  </span>
                                  {approval.feedback && (
                                    <p className="text-zinc-500 mt-0.5">{approval.feedback}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-zinc-500">
                          <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                            <User className="w-3 h-3" />
                            {review.reviewedBy || review.reviewerName || 'Unknown'}
                          </span>
                          {review.reviewerEmail && (
                            <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                              <Mail className="w-3 h-3" />
                              {review.reviewerEmail}
                            </span>
                          )}
                          {isClientReview && review.source === 'review_link' && (
                            <span className="text-blue-400/60 bg-blue-500/5 px-2 py-1 rounded">
                              via Review Link
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* ─── Comments Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'comments' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ConceptCommentsTab projectId={projectId} conceptId={conceptId} />
        </div>
      )}

      {/* ─── Review Link Modal ───────────────────────────────────────────────── */}
      {showReviewLinkModal && generatedLink && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <LinkIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Review Link Created</h3>
                <p className="text-sm text-zinc-400">
                  Share this link with your client to review this concept
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Concept</p>
                <p className="text-sm text-zinc-200 font-medium">{linkDetails?.conceptName}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Client</p>
                <p className="text-sm text-zinc-200 font-medium">{linkDetails?.clientName}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Assets</p>
                <p className="text-sm text-zinc-200">{linkDetails?.assetCount} asset(s) included</p>
              </div>
              {linkExpiry && (
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-1">Expires</p>
                  <p className="text-sm text-zinc-200">{format(new Date(linkExpiry), 'PPP')}</p>
                </div>
              )}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-blue-400 truncate flex-1">{generatedLink}</p>
                  <button
                    onClick={copyLinkToClipboard}
                    className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={copyLinkToClipboard}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  copied 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowReviewLinkModal(false);
                  setGeneratedLink(null);
                  setCopied(false);
                  fetchReviewHistory();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 text-center mt-4">
              The client can review and approve all assets without logging in.
              You'll be notified when they submit their feedback.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}