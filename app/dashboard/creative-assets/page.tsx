// app/dashboard/creative-assets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Film,
  FileVideo,
  FileAudio,
  Image,
  FileText,
  File,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Download,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  Trash2,
  Edit,
  Link2,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
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
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import toast from 'react-hot-toast';
import { getStageLabel, getProductionStages } from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreativeAsset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  productionStage: string | null;
  productionMetadata: any;
  conceptId: string;
  conceptName: string;
  taskId: string | null;
  taskTitle: string | null;
  milestoneId: string | null;
  milestoneName: string | null;
  clientAccessible: boolean;
  clientAccessUrl: string | null;
  createdAt: string;
  updatedAt: string;
  latestVersion: {
    id: string;
    versionNo: number;
    status: string;
    fileUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    duration: number | null;
    resolution: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

// ─── Status Config ──────────────────────────────────────────────────────────

const versionStatusConfig: Record<string, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string;
  icon: React.ReactNode 
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-700',
    border: 'border-gray-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  CLIENT_REVIEW: {
    label: 'Client Review',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    border: 'border-blue-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  INTERNAL_REVIEW: {
    label: 'Internal Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    border: 'border-yellow-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    border: 'border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  REVISIONS_REQUIRED: {
    label: 'Revisions',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    border: 'border-orange-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const assetTypeIcons: Record<string, React.ReactNode> = {
  MOODBOARD: <Image className="w-4 h-4" />,
  STORYBOARD: <Image className="w-4 h-4" />,
  SCRIPT: <FileText className="w-4 h-4" />,
  COPY: <FileText className="w-4 h-4" />,
  MOCKUP: <Image className="w-4 h-4" />,
  VIDEO: <FileVideo className="w-4 h-4" />,
  IMAGE: <Image className="w-4 h-4" />,
  AUDIO: <FileAudio className="w-4 h-4" />,
  DOCUMENT: <File className="w-4 h-4" />,
  OTHER: <File className="w-4 h-4" />,
  RAW_FOOTAGE: <Film className="w-4 h-4" />,
  PROXY_FOOTAGE: <Film className="w-4 h-4" />,
  EXPORT_MASTER: <FileVideo className="w-4 h-4" />,
  EXPORT_HIGH_RES: <FileVideo className="w-4 h-4" />,
  EXPORT_WEB: <FileVideo className="w-4 h-4" />,
  AUDIO_RAW: <FileAudio className="w-4 h-4" />,
  AUDIO_MIX: <FileAudio className="w-4 h-4" />,
  AUDIO_MASTER: <FileAudio className="w-4 h-4" />,
  MOTION_GRAPHICS: <Film className="w-4 h-4" />,
  VFX: <Film className="w-4 h-4" />,
  COLOR_GRADE: <Image className="w-4 h-4" />,
  SUBTITLES: <FileText className="w-4 h-4" />,
};

const ASSET_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'RAW_FOOTAGE', label: 'Raw Footage' },
  { value: 'PROXY_FOOTAGE', label: 'Proxy Footage' },
  { value: 'EXPORT_MASTER', label: 'Export Master' },
  { value: 'EXPORT_HIGH_RES', label: 'High-Res Export' },
  { value: 'EXPORT_WEB', label: 'Web Export' },
  { value: 'MOTION_GRAPHICS', label: 'Motion Graphics' },
  { value: 'VFX', label: 'VFX' },
  { value: 'COLOR_GRADE', label: 'Color Grade' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CLIENT_REVIEW', label: 'Client Review' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REVISIONS_REQUIRED', label: 'Revisions' },
  { value: 'REJECTED', label: 'Rejected' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function CreativeAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const productionStages = getProductionStages();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/creative-assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      
      // ✅ Fix: Handle the API response format correctly
      // The API returns { assets: [...], pagination: {...}, filters: {...} }
      if (data.assets && Array.isArray(data.assets)) {
        setAssets(data.assets);
        console.log(`Loaded ${data.assets.length} assets`);
      } else if (Array.isArray(data)) {
        // Fallback if API returns array directly
        setAssets(data);
        console.log(`Loaded ${data.length} assets (array format)`);
      } else {
        console.warn('Unexpected assets response format:', data);
        setAssets([]);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load creative assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.conceptName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesStatus = filterStatus === 'all' || (asset.latestVersion && asset.latestVersion.status === filterStatus);
    const matchesStage = filterStage === 'all' || asset.productionStage === filterStage;
    return matchesSearch && matchesType && matchesStatus && matchesStage;
  });

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return 'Unknown';
    const config = versionStatusConfig[status];
    return config?.label || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading creative assets...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Creative Assets</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {assets.length} total assets • {assets.filter(a => a.latestVersion?.status === 'APPROVED').length} approved
          </p>
        </div>
        <Link href="/dashboard/creative-assets/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </Link>
      </div>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-100">{assets.length}</p>
          <p className="text-[10px] text-zinc-400">Total</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {assets.filter(a => a.latestVersion?.status === 'APPROVED').length}
          </p>
          <p className="text-[10px] text-zinc-400">Approved</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {assets.filter(a => a.latestVersion?.status === 'CLIENT_REVIEW' || a.latestVersion?.status === 'INTERNAL_REVIEW').length}
          </p>
          <p className="text-[10px] text-zinc-400">In Review</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">
            {assets.filter(a => a.latestVersion?.status === 'REVISIONS_REQUIRED').length}
          </p>
          <p className="text-[10px] text-zinc-400">Revisions</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-400">
            {assets.filter(a => a.latestVersion?.status === 'REJECTED').length}
          </p>
          <p className="text-[10px] text-zinc-400">Rejected</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-400">
            {assets.filter(a => a.latestVersion?.status === 'DRAFT').length}
          </p>
          <p className="text-[10px] text-zinc-400">Draft</p>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm h-10"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 h-10"
        >
          {ASSET_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 h-10"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 h-10"
        >
          <option value="all">All Stages</option>
          {productionStages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>

        <div className="flex border border-zinc-700 rounded-lg overflow-hidden h-10">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <Button
          onClick={fetchAssets}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-10"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ─── Asset Grid ───────────────────────────────────────────────────── */}
      {filteredAssets.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No creative assets found</p>
          <p className="text-sm text-zinc-500 mt-1">
            {assets.length === 0 ? 'Upload your first asset to get started' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const latestVersion = asset.latestVersion;
            const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
            const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;

            return (
              <div
                key={asset.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors group cursor-pointer"
                onClick={() => {
                  setSelectedAsset(asset);
                  setShowDetail(true);
                }}
              >
                {/* Preview */}
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
                      <span className="text-xs">No preview</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {stageLabel && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/20 text-[9px]">
                        {stageLabel}
                      </Badge>
                    )}
                    {asset.taskId && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20 text-[9px]">
                        <Link2 className="w-3 h-3 mr-0.5" />
                        Task
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                      <span className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-zinc-100 text-sm truncate">
                        {asset.name}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate">
                        {asset.conceptName || 'Uncategorized'}
                      </p>
                    </div>
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] shrink-0">
                      v{latestVersion?.versionNo || 0}
                    </Badge>
                  </div>

                  {latestVersion?.fileSize && (
                    <p className="text-[10px] text-zinc-500">
                      {formatFileSize(latestVersion.fileSize)}
                      {latestVersion.resolution && ` • ${latestVersion.resolution}`}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/creative-assets/${asset.id}`);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    {latestVersion?.fileUrl && (
                      <a
                        href={latestVersion.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1 ml-auto"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
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
            const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;

            return (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors group cursor-pointer"
                onClick={() => {
                  setSelectedAsset(asset);
                  setShowDetail(true);
                }}
              >
                <div className="p-2 bg-zinc-900 rounded-lg shrink-0">
                  {assetTypeIcons[asset.type] || <File className="w-4 h-4 text-zinc-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-zinc-100 text-sm truncate">
                      {asset.name}
                    </h4>
                    {stageLabel && (
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                        {stageLabel}
                      </Badge>
                    )}
                    <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span>{asset.conceptName || 'Uncategorized'}</span>
                    <span>•</span>
                    <span>v{latestVersion?.versionNo || 0}</span>
                    {latestVersion?.fileSize && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(latestVersion.fileSize)}</span>
                      </>
                    )}
                    {latestVersion?.resolution && (
                      <>
                        <span>•</span>
                        <span>{latestVersion.resolution}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/creative-assets/${asset.id}`);
                    }}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-zinc-400" />
                  </button>
                  {latestVersion?.fileUrl && (
                    <a
                      href={latestVersion.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-zinc-400" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Asset Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              {selectedAsset && assetTypeIcons[selectedAsset.type]}
              {selectedAsset?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="py-4 space-y-4">
              {/* Preview */}
              {selectedAsset.latestVersion?.fileUrl && (
                <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                  {selectedAsset.latestVersion.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                    <img
                      src={selectedAsset.latestVersion.fileUrl}
                      alt={selectedAsset.name}
                      className="w-full max-h-[300px] object-contain"
                    />
                  ) : selectedAsset.latestVersion.fileUrl.match(/\.(mp4|mov|webm)$/i) ? (
                    <video
                      src={selectedAsset.latestVersion.fileUrl}
                      className="w-full max-h-[300px] object-contain"
                      controls
                      playsInline
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <File className="w-16 h-16 text-zinc-600" />
                    </div>
                  )}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Type</p>
                  <p className="text-zinc-200">{selectedAsset.type}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Concept</p>
                  <p className="text-zinc-200">{selectedAsset.conceptName || 'Uncategorized'}</p>
                </div>
                {selectedAsset.productionStage && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Production Stage</p>
                    <p className="text-zinc-200">{getStageLabel(selectedAsset.productionStage)}</p>
                  </div>
                )}
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Version</p>
                  <p className="text-zinc-200">v{selectedAsset.latestVersion?.versionNo || 0}</p>
                </div>
                {selectedAsset.latestVersion?.fileSize && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">File Size</p>
                    <p className="text-zinc-200">{formatFileSize(selectedAsset.latestVersion.fileSize)}</p>
                  </div>
                )}
                {selectedAsset.latestVersion?.resolution && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Resolution</p>
                    <p className="text-zinc-200">{selectedAsset.latestVersion.resolution}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-zinc-700/30">
                <Button
                  onClick={() => setShowDetail(false)}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </Button>
                <Link
                  href={`/dashboard/creative-assets/${selectedAsset.id}`}
                  className="ml-auto"
                >
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Full Details
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