// app/dashboard/creative-assets/[assetId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Plus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Image,
  Video,
  Music,
  File,
  ExternalLink,
  Trash2,
  RefreshCw,
  GitCompare,
  History,
  Film,
  Cloud,
  HardDrive,
  Database,
  Building,
  ListChecks,
  Lightbulb,
  GitBranch,
  Calendar,
  User,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FeedbackPanel } from '@/components/assets/FeedbackPanel';
import { getStageLabel } from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Version {
  id: string;
  versionNo: number;
  fileUrl: string | null;
  localFileUrl: string | null;
  cloudFileUrl: string | null;
  status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED';
  feedback: string | null;
  fileSize: number | null;
  mimeType: string | null;
  duration: number | null;
  resolution: string | null;
  frameRate: number | null;
  bitrate: number | null;
  codec: string | null;
  audioChannels: number | null;
  processingStatus: string | null;
  thumbnailUrl: string | null;
  primaryStorage?: string;
  isSyncedToCloud?: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reviewedAt?: string | null;
}

// Linked Entities
interface LinkedProject {
  id: string;
  name: string;
  projectName: string;
  status: string;
}

interface LinkedMilestone {
  id: string;
  name: string;
  status: string;
}

interface LinkedTask {
  id: string;
  title: string;
  status: string;
}

interface LinkedConcept {
  id: string;
  name: string;
  status: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  description: string | null;
  productionStage: string | null;
  productionMetadata: any;
  
  conceptId: string;
  conceptName: string;
  taskId: string | null;
  taskTitle: string | null;
  milestoneId: string | null;
  milestoneName: string | null;

  // ✅ Full nested objects
  project?: LinkedProject | null;
  concept?: LinkedConcept | null;
  milestone?: LinkedMilestone | null;
  task?: LinkedTask | null;

  clientAccessible: boolean;
  clientAccessUrl: string | null;
  versions: Version[];
  createdAt: string;
  updatedAt: string;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface StorageStats {
  usedGB: number;
  quotaGB: number;
  percentageUsed: number;
  isNearLimit: boolean;
  isFull: boolean;
  strategy: string;
}

// ─── Version Status Config ─────────────────────────────────────────────────

const versionStatusConfig: Record<Version['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  CLIENT_REVIEW: {
    label: 'Client Review',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: <ExternalLink className="w-3.5 h-3.5" />,
  },
  INTERNAL_REVIEW: {
    label: 'Internal Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  REVISIONS_REQUIRED: {
    label: 'Revisions Required',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

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
  RAW_FOOTAGE: <Film className="w-4 h-4" />,
  PROXY_FOOTAGE: <Film className="w-4 h-4" />,
  EXPORT_MASTER: <Video className="w-4 h-4" />,
  EXPORT_HIGH_RES: <Video className="w-4 h-4" />,
  EXPORT_WEB: <Video className="w-4 h-4" />,
  AUDIO_RAW: <Music className="w-4 h-4" />,
  AUDIO_MIX: <Music className="w-4 h-4" />,
  AUDIO_MASTER: <Music className="w-4 h-4" />,
  MOTION_GRAPHICS: <Film className="w-4 h-4" />,
  VFX: <Film className="w-4 h-4" />,
  COLOR_GRADE: <Image className="w-4 h-4" />,
  SUBTITLES: <FileText className="w-4 h-4" />,
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function CreativeAssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params?.assetId as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [selectedVersionForFeedback, setSelectedVersionForFeedback] = useState<Version | null>(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [syncingVersion, setSyncingVersion] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAsset();
    fetchReviewHistory();
    fetchStorageStats();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(`/api/creative-assets/${assetId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Asset not found');
          router.push('/dashboard/creative-assets');
          return;
        }
        throw new Error('Failed to fetch asset');
      }
      const data = await response.json();
      setAsset(data);
    } catch (error) {
      console.error('Error fetching asset:', error);
      toast.error('Failed to load asset');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewHistory = async () => {
    setLoadingReviews(true);
    try {
      const response = await fetch(`/api/creative-assets/${assetId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviewHistory(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const response = await fetch('/api/creative-assets/storage-stats');
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data.stats || data);
      }
    } catch (error) {
      console.error('Error fetching storage stats:', error);
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/creative-assets/${assetId}/versions`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload version');
      }

      toast.success('New version uploaded successfully');
      await fetchAsset();
      await fetchStorageStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload version');
    } finally {
      setUploadingVersion(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSyncToCloud = async (versionId: string) => {
    setSyncingVersion(versionId);
    try {
      const response = await fetch(`/api/creative-assets/${assetId}/versions/${versionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'local-to-cloud' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync to cloud');
      }

      toast.success('Version synced to cloud successfully');
      await fetchAsset();
      await fetchStorageStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync to cloud');
    } finally {
      setSyncingVersion(null);
    }
  };

  const handleVersionStatusChange = async (versionId: string, status: Version['status']) => {
    try {
      const response = await fetch(`/api/creative-assets/${assetId}/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update version status');
      }

      toast.success(`Version status updated to ${status.replace('_', ' ')}`);
      await fetchAsset();
      await fetchReviewHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update version status');
    }
  };

  const handleDeleteVersion = async (versionId: string, versionNo: number) => {
    if (!confirm(`Are you sure you want to delete version ${versionNo}?`)) return;

    try {
      const response = await fetch(`/api/creative-assets/${assetId}/versions/${versionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete version');
      }

      toast.success('Version deleted successfully');
      await fetchAsset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete version');
    }
  };

  const handleSubmitFeedback = async (feedback: string) => {
    if (!selectedVersionForFeedback) return;

    setSubmittingFeedback(true);
    try {
      const response = await fetch(`/api/creative-assets/${assetId}/versions/${selectedVersionForFeedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback.trim(),
          status: 'REVISIONS_REQUIRED',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted successfully');
      setSelectedVersionForFeedback(null);
      setShowFeedbackPanel(false);
      await fetchAsset();
      await fetchReviewHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!confirm('Are you sure you want to delete this asset and all its versions?')) return;

    try {
      const response = await fetch(`/api/creative-assets/${assetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      toast.success('Asset deleted successfully');
      router.push('/dashboard/creative-assets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStorageIcon = (primaryStorage?: string) => {
    if (!primaryStorage) return <HardDrive className="w-3 h-3" />;
    if (primaryStorage === 'CLOUD' || primaryStorage === 'BOTH') {
      return <Cloud className="w-3 h-3" />;
    }
    return <HardDrive className="w-3 h-3" />;
  };

  const getStorageLabel = (primaryStorage?: string) => {
    if (!primaryStorage) return 'Local';
    if (primaryStorage === 'BOTH') return 'Local + Cloud';
    if (primaryStorage === 'CLOUD') return 'Cloud';
    return 'Local';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading asset...
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-zinc-100">Asset not found</h2>
        <p className="mt-2 text-zinc-500">The asset you're looking for doesn't exist.</p>
      </div>
    );
  }

  const latestVersion = asset.versions[0];
  const assetIcon = assetTypeIcons[asset.type] || <File className="w-4 h-4" />;
  const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;

  // Review stats
  const totalReviews = reviewHistory.length;
  const approvedReviews = reviewHistory.filter((r: any) => r.status === 'APPROVED').length;
  const rejectedReviews = reviewHistory.filter((r: any) => r.status === 'REJECTED' || r.status === 'REVISIONS_REQUIRED').length;
  const pendingReviews = reviewHistory.filter((r: any) => r.status === 'CLIENT_REVIEW' || r.status === 'INTERNAL_REVIEW').length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/creative-assets"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Creative Assets
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-300 font-medium truncate max-w-[200px]">
          {asset.name}
        </span>
      </nav>

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-zinc-800 rounded-lg">
              {assetIcon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-100">{asset.name}</h1>
                {stageLabel && (
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    {stageLabel}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                <span>{asset.type.replace('_', ' ')}</span>
                <span>•</span>
                <span>{asset.versions.length} versions</span>
                <span>•</span>
                <span>Updated {format(new Date(asset.updatedAt), 'PPP')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/creative-assets/${assetId}/compare`}>
              <Button size="sm" variant="outline" className="border-blue-600/30 text-blue-400 hover:bg-blue-950/20">
                <GitCompare className="w-4 h-4 mr-1.5" />
                Compare Versions
              </Button>
            </Link>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingVersion}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {uploadingVersion ? 'Uploading...' : 'New Version'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUploadVersion}
              className="hidden"
            />
            <Button
              onClick={handleDeleteAsset}
              variant="outline"
              size="sm"
              className="border-red-800/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Asset
            </Button>
          </div>
        </div>

        {/* Latest Version Preview */}
        {latestVersion && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-zinc-500">Latest Version:</span>
              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono">
                v{latestVersion.versionNo}
              </Badge>
              {latestVersion.status && (
                <Badge className={versionStatusConfig[latestVersion.status].bg}>
                  <span className={`flex items-center gap-1 ${versionStatusConfig[latestVersion.status].color}`}>
                    {versionStatusConfig[latestVersion.status].icon}
                    {versionStatusConfig[latestVersion.status].label}
                  </span>
                </Badge>
              )}
              <Badge className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-[9px] flex items-center gap-1">
                {getStorageIcon(latestVersion.primaryStorage)}
                {getStorageLabel(latestVersion.primaryStorage)}
              </Badge>
              {latestVersion.fileSize && (
                <span className="text-xs text-zinc-500">
                  {formatFileSize(latestVersion.fileSize)}
                </span>
              )}
              {latestVersion.resolution && (
                <span className="text-xs text-zinc-500">
                  {latestVersion.resolution}
                </span>
              )}
              {latestVersion.fileUrl && (
                <a
                  href={latestVersion.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              )}
            </div>
          </div>
        )}

        {/* ✅ NEW: Linked Entities Row */}
        {(asset.project || asset.milestone || asset.task || asset.concept) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Linked To:</span>
            
            {asset.project && (
              <Link href={`/dashboard/projects/${asset.project.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-blue-400 transition-colors">
                <Building className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-medium">{asset.project.projectName || asset.project.name}</span>
              </Link>
            )}

            {asset.task && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <Link href={`/dashboard/tasks/${asset.task.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors">
                  <ListChecks className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Task: {asset.task.title}</span>
                </Link>
              </>
            )}

            {asset.concept && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <Link href={`/dashboard/projects/${asset.project?.id}/concepts/${asset.concept.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors">
                  <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Concept: {asset.concept.name}</span>
                </Link>
              </>
            )}

            {asset.milestone && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <Link href={`/dashboard/projects/${asset.project?.id}?milestone=${asset.milestone.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Milestone: {asset.milestone.name}</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Storage Stats ────────────────────────────────────────────────── */}
      {storageStats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              Storage Usage
            </span>
            <span className={
              storageStats.isFull ? 'text-red-400' : 
              storageStats.isNearLimit ? 'text-amber-400' : 
              'text-zinc-400'
            }>
              {storageStats.usedGB.toFixed(2)} GB / {storageStats.quotaGB.toFixed(0)} GB
            </span>
          </div>
          <Progress 
            value={Math.min(storageStats.percentageUsed, 100)} 
            className={`h-2 ${
              storageStats.isFull ? 'bg-red-500/20' : 
              storageStats.isNearLimit ? 'bg-amber-500/20' : 
              'bg-zinc-700/50'
            }`}
          />
          {storageStats.isNearLimit && (
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Storage is nearing capacity — consider syncing older assets to cloud or upgrading.
            </p>
          )}
          {storageStats.isFull && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Storage is full. Please upgrade your plan or free up space.
            </p>
          )}
        </div>
      )}

      {/* ─── Production Context ───────────────────────────────────────────── */}
      {(asset.project || asset.milestone || asset.task || asset.concept) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-blue-400" />
            Production Context
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/dashboard/projects/${asset.project?.id}`} className="bg-zinc-800 px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors">
              <strong className="text-zinc-100">Project:</strong> {asset.project?.projectName || 'N/A'}
            </Link>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <Link href={`/dashboard/tasks/${asset.task?.id}`} className="bg-zinc-800 px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors">
              <strong className="text-zinc-100">Task:</strong> {asset.task?.title || 'N/A'}
            </Link>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <Link href={`/dashboard/projects/${asset.project?.id}/concepts/${asset.concept?.id}`} className="bg-zinc-800 px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors">
              <strong className="text-zinc-100">Concept:</strong> {asset.concept?.name || 'N/A'}
            </Link>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <div className="bg-zinc-800 px-3 py-2 rounded-lg text-zinc-300">
              <strong className="text-zinc-100">Milestone:</strong> {asset.milestone?.name || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* ─── Review Summary ───────────────────────────────────────────────── */}
      {reviewHistory.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare  className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-200">Review Summary</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400">✓ {approvedReviews} Approved</span>
              <span className="text-amber-400">⏳ {pendingReviews} Pending</span>
              <span className="text-red-400">✗ {rejectedReviews} Rejected</span>
              <span className="text-zinc-500">Total: {totalReviews}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Asset Preview ────────────────────────────────────────────────── */}
      {latestVersion?.fileUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="aspect-video bg-zinc-950 flex items-center justify-center">
            {latestVersion?.fileUrl ? (
            latestVersion.mimeType?.startsWith('image/') ? (
                <img
                src={latestVersion.fileUrl}
                alt={asset.name}
                className="w-full h-full object-contain max-h-[500px]"
                />
            ) : latestVersion.mimeType?.startsWith('video/') ? (
                <video
                src={latestVersion.fileUrl}
                className="w-full h-full object-contain max-h-[500px]"
                controls
                playsInline
                />
            ) : latestVersion.mimeType?.startsWith('audio/') ? (
                <div className="p-8 text-center">
                <Music className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <audio src={latestVersion.fileUrl} controls className="w-full max-w-md" />
                </div>
            ) : (
                <div className="text-zinc-500 flex flex-col items-center gap-4 p-8">
                <File className="w-16 h-16 text-zinc-600" />
                <p className="text-sm">{asset.type}</p>
                <a href={latestVersion.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                </a>
                </div>
            )
            ) : null}
          </div>
        </div>
      )}

      {/* ─── Version History ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-blue-400" />
          Version History
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono text-[9px] ml-1">
            {asset.versions.length}
          </Badge>
        </h2>

        {asset.versions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <p className="text-sm">No versions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {asset.versions.map((version, index) => {
              const status = versionStatusConfig[version.status];
              const isLatest = index === 0;
              const isLocalOnly = version.primaryStorage === 'LOCAL' && !version.isSyncedToCloud;

              return (
                <div
                  key={version.id}
                  className={`bg-zinc-950/60 border rounded-lg p-4 transition-colors ${
                    isLatest ? 'border-blue-500/30 bg-blue-500/5' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono">
                          v{version.versionNo}
                        </Badge>
                        {isLatest && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                            Latest
                          </Badge>
                        )}
                        <Badge className={`${status.bg} border font-mono text-[10px] ${status.color}`}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                        {/* Storage indicator */}
                        <Badge className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-[9px] flex items-center gap-1">
                          {getStorageIcon(version.primaryStorage)}
                          {getStorageLabel(version.primaryStorage)}
                        </Badge>
                        {version.fileSize && (
                          <span className="text-xs text-zinc-500">
                            {formatFileSize(version.fileSize)}
                          </span>
                        )}
                        {version.resolution && (
                          <span className="text-xs text-zinc-500">
                            {version.resolution}
                          </span>
                        )}
                      </div>

                      {version.feedback && (
                        <div className="mt-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <p className="text-xs text-zinc-300">{version.feedback}</p>
                          {version.reviewedBy && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                              <User className="w-3 h-3" />
                              <span>{typeof version.reviewedBy === 'object' ? version.reviewedBy.name : version.reviewedBy}</span>
                              {typeof version.reviewedBy === 'object' && version.reviewedBy.role && (
                                <>
                                  <span>•</span>
                                  <span>{version.reviewedBy.role}</span>
                                </>
                              )}
                              {version.reviewedAt && (
                                <>
                                  <span>•</span>
                                  <span>{format(new Date(version.reviewedAt), 'PPP p')}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-500 mt-1">
                        {format(new Date(version.createdAt), 'PPP p')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {version.fileUrl && (
                        <a
                          href={version.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}

                      {/* Sync to Cloud button (only for local-only versions) */}
                      {isLocalOnly && (
                        <button
                          onClick={() => handleSyncToCloud(version.id)}
                          disabled={syncingVersion === version.id}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {syncingVersion === version.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Cloud className="w-3 h-3" />
                          )}
                          Sync to Cloud
                        </button>
                      )}

                      {/* Status Actions */}
                      {version.status === 'DRAFT' && (
                        <button
                          onClick={() => handleVersionStatusChange(version.id, 'INTERNAL_REVIEW')}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          Review
                        </button>
                      )}
                      {version.status === 'INTERNAL_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleVersionStatusChange(version.id, 'APPROVED')}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVersionForFeedback(version);
                              setShowFeedbackPanel(true);
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            Revisions
                          </button>
                          <button
                            onClick={() => handleVersionStatusChange(version.id, 'REJECTED')}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {version.status === 'APPROVED' && (
                        <button
                          onClick={() => handleVersionStatusChange(version.id, 'CLIENT_REVIEW')}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          Client Review
                        </button>
                      )}
                      {version.status === 'REVISIONS_REQUIRED' && (
                        <>
                          <button
                            onClick={() => handleVersionStatusChange(version.id, 'INTERNAL_REVIEW')}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            Review Again
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVersionForFeedback(version);
                              setShowFeedbackPanel(true);
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            Update Feedback
                          </button>
                        </>
                      )}
                      {asset.versions.length > 1 && (
                        <button
                          onClick={() => handleDeleteVersion(version.id, version.versionNo)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Delete Version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Feedback Panel ────────────────────────────────────────────────── */}
      <FeedbackPanel
        isOpen={showFeedbackPanel}
        onClose={() => {
          setShowFeedbackPanel(false);
          setSelectedVersionForFeedback(null);
        }}
        onSubmit={handleSubmitFeedback}
        assetName={asset?.name}
        versionNumber={selectedVersionForFeedback?.versionNo}
        isSubmitting={submittingFeedback}
      />
    </div>
  );
}