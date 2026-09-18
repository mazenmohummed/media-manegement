// components/production/ProductionTaskDetail.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Upload,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  Image,
  Video,
  Music,
  File,
  Grid3x3,
  List,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  GitBranch,
  Calendar,
  User,
  Building,
  Layers,
  Film,
  Mic,
  Camera,
  Clapperboard,
  Link2,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ProductionAssetUploader } from './ProductionAssetUploader';
import { getStageLabel, getProductionStages } from '@/lib/validations/production-assets';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface CreativeAsset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  productionStage: string | null;
  productionMetadata: any;
  conceptId: string;
  taskId: string | null;
  milestoneId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: CreativeAssetVersion[];
  latestVersion: CreativeAssetVersion | null;
  tags: Tag[];
}

interface CreativeAssetVersion {
  id: string;
  versionNo: number;
  status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED';
  fileUrl: string | null;
  localFileUrl: string | null;
  cloudFileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  duration: number | null;
  resolution: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string | null; 
  status: string;
  priority: string;
  taskType: string;
  projectId: string;
  milestoneId: string | null;
  description: string | null;
  dueDate: string | null;
}

interface ProductionTaskDetailProps {
  taskId: string;
  projectId: string;
  task: Task;
  onAssetAttached?: () => void;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const versionStatusConfig: Record<CreativeAssetVersion['status'], { 
  label: string; 
  color: string; 
  bg: string; 
  border?: string;  // Add this as optional
  icon: React.ReactNode 
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-700',
    border: 'border-gray-700',  // Add this
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  CLIENT_REVIEW: {
    label: 'Client Review',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    border: 'border-blue-500/20',  // Add this
    icon: <ExternalLink className="w-3.5 h-3.5" />,
  },
  INTERNAL_REVIEW: {
    label: 'Internal Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    border: 'border-yellow-500/20',  // Add this
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    border: 'border-emerald-500/20',  // Add this
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    border: 'border-red-500/20',  // Add this
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  REVISIONS_REQUIRED: {
    label: 'Revisions Required',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    border: 'border-orange-500/20',  // Add this
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
  AUDIO_RAW: <Mic className="w-4 h-4" />,
  AUDIO_MIX: <Mic className="w-4 h-4" />,
  AUDIO_MASTER: <Mic className="w-4 h-4" />,
  MOTION_GRAPHICS: <Clapperboard className="w-4 h-4" />,
  VFX: <Clapperboard className="w-4 h-4" />,
  COLOR_GRADE: <Image className="w-4 h-4" />,
  SUBTITLES: <FileText className="w-4 h-4" />,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductionTaskDetail({
  taskId,
  projectId,
  task,
  onAssetAttached,
}: ProductionTaskDetailProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<CreativeAsset[]>([]);
  const [attaching, setAttaching] = useState(false);

  // Production stages for filter
  const productionStages = getProductionStages();

  useEffect(() => {
    fetchTaskAssets();
    fetchAvailableAssets();
  }, [taskId]);

  const fetchTaskAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assets`);
      if (!response.ok) throw new Error('Failed to fetch task assets');
      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching task assets:', error);
      toast.error('Failed to load production assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

const fetchAvailableAssets = async () => {
  try {
    const response = await fetch(`/api/projects/${projectId}/creative-assets`);
    let data: any;

    if (!response.ok) {
      console.warn('Project creative-assets endpoint failed, trying alternative...');
      const altResponse = await fetch(`/api/creative-assets`);
      if (!altResponse.ok) throw new Error('Failed to fetch available assets');
      data = await altResponse.json();
    } else {
      data = await response.json();
    }

    // Normalize response shape — handle both { assets: [...] } and bare array
    const list: any[] = Array.isArray(data) ? data : (data.assets || []);

    // Client-side filter: only assets not yet attached to any task
    const unattached = list.filter((asset: any) => !asset.taskId);

    setAvailableAssets(unattached);
  } catch (error) {
    console.error('Error fetching available assets:', error);
    setAvailableAssets([]);
  }
};

  const handleAttachAsset = async (assetId: string, conceptId: string) => {
  setAttaching(true);
  try {
    const response = await fetch(
      `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/attach-production`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to attach asset');
    }

    toast.success('Asset attached to task successfully');
    setAttachDialogOpen(false);
    await fetchTaskAssets();
    await fetchAvailableAssets();
    if (onAssetAttached) onAssetAttached();
  } catch (error: any) {
    toast.error(error.message || 'Failed to attach asset');
  } finally {
    setAttaching(false);
  }
};

const handleDetachAsset = async (assetId: string, conceptId: string) => {
  if (!confirm('Remove this asset from the task?')) return;

  try {
    const response = await fetch(
      `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/attach-production`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: null,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to detach asset');
    }

    toast.success('Asset detached from task');
    await fetchTaskAssets();
    await fetchAvailableAssets();
    if (onAssetAttached) onAssetAttached();
  } catch (error: any) {
    toast.error(error.message || 'Failed to detach asset');
  }
};

  const handleUploadComplete = (versionId: string, fileUrl: string) => {
    setUploadDialogOpen(false);
    fetchTaskAssets();
    fetchAvailableAssets();
    if (onAssetAttached) onAssetAttached();
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'all' || asset.productionStage === filterStage;
    const matchesStatus = filterStatus === 'all' ||
                          (asset.latestVersion && asset.latestVersion.status === filterStatus);
    return matchesSearch && matchesStage && matchesStatus;
  });

  // Count assets by status
  const assetStats = {
    total: assets.length,
    draft: assets.filter(a => a.latestVersion?.status === 'DRAFT').length,
    inReview: assets.filter(a => a.latestVersion?.status === 'CLIENT_REVIEW' || a.latestVersion?.status === 'INTERNAL_REVIEW').length,
    approved: assets.filter(a => a.latestVersion?.status === 'APPROVED').length,
    revisions: assets.filter(a => a.latestVersion?.status === 'REVISIONS_REQUIRED').length,
    rejected: assets.filter(a => a.latestVersion?.status === 'REJECTED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Film className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Production Assets</h3>
            <p className="text-xs text-zinc-400">
              {assets.length} asset{assets.length !== 1 ? 's' : ''} attached
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <Button
            onClick={() => setAttachDialogOpen(true)}
            size="sm"
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            disabled={availableAssets.length === 0}
        >
            <Link2 className="w-4 h-4 mr-1.5" />
            Attach Existing
        </Button>
        <Button
            onClick={() => setUploadDialogOpen(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
        >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Asset
        </Button>
        </div>

      </div>

      {/* ─── Asset Stats ──────────────────────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-zinc-100">{assetStats.total}</p>
            <p className="text-[10px] text-zinc-400">Total</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{assetStats.draft}</p>
            <p className="text-[10px] text-zinc-400">Draft</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-400">{assetStats.inReview}</p>
            <p className="text-[10px] text-zinc-400">In Review</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{assetStats.approved}</p>
            <p className="text-[10px] text-zinc-400">Approved</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-orange-400">{assetStats.revisions}</p>
            <p className="text-[10px] text-zinc-400">Revisions</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-red-400">{assetStats.rejected}</p>
            <p className="text-[10px] text-zinc-400">Rejected</p>
          </div>
        </div>
      )}

      {/* ─── Filters ──────────────────────────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm h-9"
            />
          </div>

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-purple-500 h-9"
          >
            <option value="all">All Stages</option>
            {productionStages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-purple-500 h-9"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="INTERNAL_REVIEW">Internal Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISIONS_REQUIRED">Revisions</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="flex border border-zinc-700 rounded-lg overflow-hidden h-9">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Asset List ──────────────────────────────────────────────────────── */}
      {assets.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8 text-center">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No production assets attached to this task</p>
          <p className="text-sm text-zinc-500 mt-1">
            Upload a new asset or attach an existing one from the project
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const latestVersion = asset.latestVersion;
            const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
            const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : 'No Stage';

            return (
              <div
                key={asset.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors group"
              >
                {/* Asset Preview */}
                <div className="aspect-video bg-zinc-900 flex items-center justify-center relative">
                  {latestVersion?.fileUrl ? (
                    latestVersion.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                      <img
                        src={latestVersion.fileUrl}
                        alt={asset.name}
                        className="w-full h-full object-contain"
                      />
                    ) : latestVersion.fileUrl.match(/\.(mp4|mov|webm)$/i) ? (
                      <video
                        src={latestVersion.fileUrl}
                        className="w-full h-full object-contain"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="text-zinc-500 flex flex-col items-center gap-2">
                        {assetTypeIcons[asset.type] || <File className="w-8 h-8" />}
                        <span className="text-xs">{asset.type}</span>
                      </div>
                    )
                  ) : (
                    <div className="text-zinc-500 flex flex-col items-center gap-2">
                      {assetTypeIcons[asset.type] || <File className="w-8 h-8" />}
                      <span className="text-xs">No file</span>
                    </div>
                  )}
                  {/* Production Stage Badge */}
                  {asset.productionStage && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/20 text-[9px]">
                        {stageLabel}
                      </Badge>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                      <span className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </Badge>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h4 className="font-medium text-zinc-100 text-sm truncate">{asset.name}</h4>
                      <p className="text-xs text-zinc-400 truncate">{asset.type}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-zinc-700 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                        <DropdownMenuItem
                          className="text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssetDetail(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                        className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                        onClick={() => handleDetachAsset(asset.id, asset.conceptId)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Detach
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Version info */}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>v{latestVersion?.versionNo || 0}</span>
                    <span>{latestVersion ? format(new Date(latestVersion.createdAt), 'MMM d, yyyy') : 'No version'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/30">
                    {latestVersion?.fileUrl && (
                      <a
                        href={latestVersion.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowAssetDetail(true);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3 h-3" /> Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => {
            const latestVersion = asset.latestVersion;
            const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
            const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : 'No Stage';

            return (
              <div
                key={asset.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 hover:bg-zinc-800/70 transition-colors flex items-center gap-4"
              >
                <div className="p-2 bg-zinc-900 rounded-lg">
                  {assetTypeIcons[asset.type] || <File className="w-5 h-5 text-zinc-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-zinc-100 text-sm truncate">{asset.name}</h4>
                    {asset.productionStage && (
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                        {stageLabel}
                      </Badge>
                    )}
                    <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">{asset.type}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>v{latestVersion?.versionNo || 0}</span>
                  <span>{latestVersion ? format(new Date(latestVersion.createdAt), 'MMM d, yyyy') : 'No version'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {latestVersion?.fileUrl && (
                    <a
                      href={latestVersion.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-zinc-400" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowAssetDetail(true);
                    }}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-purple-400" />
                  </button>
                  <button
                    onClick={() => handleDetachAsset(asset.id, asset.conceptId)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Upload Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Upload Production Asset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ProductionAssetUploader
              projectId={projectId}
              conceptId=""
              assetId=""
              assetType="VIDEO"
              onUploadComplete={handleUploadComplete}
              onUploadError={(error) => toast.error(error)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Attach Existing Asset Dialog ──────────────────────────────────── */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Attach Existing Asset</DialogTitle>
            <p className="text-sm text-zinc-400">Select an asset to attach to this task</p>
          </DialogHeader>
          <div className="py-4">
            {availableAssets.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
                <Layers className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p>No unattached assets available</p>
                <p className="text-xs text-zinc-600 mt-1">
                All assets in this project are already attached to tasks.
                <br />
                <Link 
                    href={`/dashboard/creative-assets/new?projectId=${projectId}&taskId=${taskId}`}
                    className="text-purple-400 hover:text-purple-300"
                >
                    Upload a new asset
                </Link>
                </p>
            </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableAssets.map((asset) => {
                  const latestVersion = asset.latestVersion;
                  const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : 'No Stage';

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-zinc-900 rounded-lg shrink-0">
                          {assetTypeIcons[asset.type] || <File className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{asset.name}</p>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span>{asset.type}</span>
                            {asset.productionStage && (
                              <>
                                <span>•</span>
                                <span className="text-purple-400">{stageLabel}</span>
                              </>
                            )}
                            {latestVersion && (
                              <>
                                <span>•</span>
                                <span>v{latestVersion.versionNo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAttachAsset(asset.id, asset.conceptId)}
                        disabled={attaching}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Link2 className="w-4 h-4 mr-1.5" />
                        Attach
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Asset Detail Dialog ───────────────────────────────────────────── */}
      <Dialog open={showAssetDetail} onOpenChange={setShowAssetDetail}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              {selectedAsset && assetTypeIcons[selectedAsset.type]}
              {selectedAsset?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="py-4 space-y-4">
              {/* Asset details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Type</p>
                  <p className="text-zinc-200">{selectedAsset.type}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Stage</p>
                  <p className="text-zinc-200">
                    {selectedAsset.productionStage ? getStageLabel(selectedAsset.productionStage) : 'Not assigned'}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Versions</p>
                  <p className="text-zinc-200">{selectedAsset.versions.length}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Created</p>
                  <p className="text-zinc-200">{format(new Date(selectedAsset.createdAt), 'PPP')}</p>
                </div>
              </div>

              {/* Versions */}
              {selectedAsset.versions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 mb-2">Versions</h4>
                  <div className="space-y-2">
                    {selectedAsset.versions.slice(0, 5).map((version) => {
                      const statusInfo = versionStatusConfig[version.status];
                      return (
                        <div
                          key={version.id}
                          className="flex items-center justify-between p-2 bg-zinc-800/30 border border-zinc-700/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">
                              v{version.versionNo}
                            </Badge>
                            <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                              {statusInfo.label}
                            </Badge>
                            {version.fileSize && (
                              <span className="text-xs text-zinc-500">
                                {(version.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                            {version.resolution && (
                              <span className="text-xs text-zinc-500">{version.resolution}</span>
                            )}
                          </div>
                          {version.fileUrl && (
                            <a
                              href={version.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-zinc-700 rounded-md transition-colors"
                            >
                              <Download className="w-4 h-4 text-zinc-400" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                    {selectedAsset.versions.length > 5 && (
                      <p className="text-xs text-zinc-500 text-center">
                        +{selectedAsset.versions.length - 5} more versions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-zinc-700/30">
                <Button
                  onClick={() => setShowAssetDetail(false)}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </Button>
                <Link
                  href={`/dashboard/projects/${projectId}/concepts/${selectedAsset.conceptId}/assets/${selectedAsset.id}`}
                  target="_blank"
                  className="ml-auto"
                >
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Open Full Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}