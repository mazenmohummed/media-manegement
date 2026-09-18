// components/production/AssetSelectorModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
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
  Grid3x3,
  List,
  Eye,
  ChevronDown,
  RefreshCw,
  Link2,
  Check,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import toast from 'react-hot-toast';
import { getStageLabel } from '@/lib/validations/production-assets';

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
  latestVersion: {
    id: string;
    versionNo: number;
    status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED';
    fileUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    duration: number | null;
    resolution: string | null;
    createdAt: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface AssetSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  taskId: string;
  onAttach: (assetId: string) => Promise<void>;
  attachedAssetIds?: string[];
}

// ─── Status Config ────────────────────────────────────────────────────────────

// ─── Status Config ────────────────────────────────────────────────────────────

const versionStatusConfig: Record<string, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string;  // Add this required property
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
    icon: <Clock className="w-3.5 h-3.5" />,
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
    label: 'Revisions',
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

// ─── Component ───────────────────────────────────────────────────────────────

export function AssetSelectorModal({
  open,
  onOpenChange,
  projectId,
  taskId,
  onAttach,
  attachedAssetIds = [],
}: AssetSelectorModalProps) {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // ─── Fetch Assets ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open, projectId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/creative-assets?unattached=true&excludeTask=${taskId}`
      );
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter Assets ─────────────────────────────────────────────────────────

  const filteredAssets = assets.filter(asset => {
    // Search filter
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchesType = filterType === 'all' || asset.type === filterType;
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || 
                          (asset.latestVersion && asset.latestVersion.status === filterStatus);
    
    // Exclude already attached
    const isAttached = attachedAssetIds.includes(asset.id);
    
    return matchesSearch && matchesType && matchesStatus && !isAttached;
  });

  // ─── Handle Attach ─────────────────────────────────────────────────────────

  const handleAttach = async (assetId: string) => {
    setAttaching(true);
    try {
      await onAttach(assetId);
      toast.success('Asset attached to task');
      // Remove from list
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setSelectedAsset(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach asset');
    } finally {
      setAttaching(false);
    }
  };

  // ─── Format Helpers ────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown size';
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

  const getTypeLabel = (type: string) => {
    const option = ASSET_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <Link2 className="w-5 h-5 text-purple-400" />
              Attach Production Asset
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* ─── Filters ──────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm h-9"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-purple-500 h-9"
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
                className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-purple-500 h-9"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={fetchAssets}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Asset List ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Film className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <p className="text-sm">No unattached assets found</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Try adjusting your filters or upload a new asset
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map((asset) => {
                    const latestVersion = asset.latestVersion;
                    const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
                    const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;
                    const isSelected = selectedAsset?.id === asset.id;

                    return (
                      <div
                        key={asset.id}
                        className={`bg-zinc-800/50 border rounded-xl overflow-hidden transition-all cursor-pointer group ${
                          isSelected 
                            ? 'border-purple-500/50 ring-2 ring-purple-500/20' 
                            : 'border-zinc-700/50 hover:border-zinc-600'
                        }`}
                        onClick={() => setSelectedAsset(asset)}
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
                                {getTypeLabel(asset.type)}
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

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAttach(asset.id);
                            }}
                            disabled={attaching}
                            size="sm"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          >
                            <Link2 className="w-3.5 h-3.5 mr-1.5" />
                            Attach to Task
                          </Button>
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
                        className="flex items-center gap-4 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors group"
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
                            <span>{getTypeLabel(asset.type)}</span>
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
                        <Button
                          onClick={() => handleAttach(asset.id)}
                          disabled={attaching}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>

          {/* ─── Footer ────────────────────────────────────────────────────── */}
          <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-zinc-500">
                {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} available
              </p>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}