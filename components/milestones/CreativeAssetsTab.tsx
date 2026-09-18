// components/milestones/CreativeAssetsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  RefreshCw,
  Plus,
  Search,
  Grid3x3,
  List,
  Eye,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Image,
  Video,
  Music,
  File,
  MoreVertical,
  Trash2,
  Link2,
  Unlink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
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
import { getStageLabel } from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreativeAsset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  productionStage: string | null;
  conceptId: string;
  conceptName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  milestoneId: string | null;
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
  tags: { id: string; name: string; color: string }[];
}

interface AvailableAsset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  productionStage: string | null;
  conceptName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  milestoneId: string | null;
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
  createdAt: string;
}

interface CreativeAssetsTabProps {
  milestoneId: string;
  projectId: string;
  onUpdate?: () => void;
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

export function CreativeAssetsTab({ milestoneId, projectId, onUpdate }: CreativeAssetsTabProps) {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ─── Link Existing Asset State ──────────────────────────────────────────
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [milestoneId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/creative-assets`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching milestone assets:', error);
      toast.error('Failed to load creative assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Available Assets for Linking ─────────────────────────────────
  const fetchAvailableAssets = async () => {
    if (!projectId) {
      toast.error('No project associated with this milestone');
      return;
    }

    setLoadingAvailable(true);
    try {
      // Fetch assets in the project that are NOT linked to any milestone
      const response = await fetch(
        `/api/projects/${projectId}/creative-assets?unattached=true&excludeMilestone=${milestoneId}`
      );
      if (!response.ok) throw new Error('Failed to fetch available assets');
      const data = await response.json();
      setAvailableAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching available assets:', error);
      toast.error('Failed to load available assets');
      setAvailableAssets([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const openLinkDialog = () => {
    setShowLinkDialog(true);
    fetchAvailableAssets();
  };

  // ─── Link Asset to Milestone ─────────────────────────────────────────────
  const handleLinkAsset = async (assetId: string) => {
    setLinking(assetId);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link asset');
      }

      toast.success('Asset linked to milestone successfully!');
      setShowLinkDialog(false);
      fetchAssets();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link asset');
    } finally {
      setLinking(null);
    }
  };

  // ─── Unlink Asset from Milestone ─────────────────────────────────────────
  const handleUnlinkAsset = async (assetId: string) => {
    if (!confirm('Remove this asset from the milestone? It will remain available in the project.')) return;

    setUnlinking(assetId);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink asset');
      }

      toast.success('Asset unlinked from milestone');
      fetchAssets();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink asset');
    } finally {
      setUnlinking(null);
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.conceptName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredAvailable = availableAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                          asset.description?.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                          asset.conceptName?.toLowerCase().includes(linkSearchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            Creative Assets
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {assets.length}
            </Badge>
          </h3>
          <p className="text-xs text-zinc-400">
            All creative assets linked to this milestone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openLinkDialog}
            variant="outline"
            size="sm"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Link2 className="w-4 h-4 mr-1.5" />
            Link Existing
          </Button>
          <Link href={`/dashboard/creative-assets/new?projectId=${projectId}&milestoneId=${milestoneId}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Asset
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────────── */}
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

          <Button
            onClick={fetchAssets}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ─── Asset List ────────────────────────────────────────────────────── */}
      {assets.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8 text-center">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No creative assets linked to this milestone</p>
          <p className="text-sm text-zinc-500 mt-1">
            Create a new asset or link existing ones from the project
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const latestVersion = asset.latestVersion;
            const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
            const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;

            return (
              <div
                key={asset.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors group"
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
                  {/* Unlink button */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlinkAsset(asset.id);
                      }}
                      disabled={unlinking === asset.id}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 bg-zinc-900/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full"
                      title="Unlink from milestone"
                    >
                      {unlinking === asset.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3" />
                      )}
                    </Button>
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
                    <Link
                      href={`/dashboard/creative-assets/${asset.id}`}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </Link>
                    {latestVersion?.fileUrl && (
                      <a
                        href={latestVersion.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
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
                  <Link
                    href={`/dashboard/creative-assets/${asset.id}`}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-zinc-400" />
                  </Link>
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
                  <Button
                    onClick={() => handleUnlinkAsset(asset.id)}
                    disabled={unlinking === asset.id}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    title="Unlink from milestone"
                  >
                    {unlinking === asset.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Unlink className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Link Existing Asset Dialog ───────────────────────────────────── */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Link Existing Asset
            </DialogTitle>
            <p className="text-sm text-zinc-400">
              Select an asset from the project to link to this milestone
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search assets..."
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
                <Film className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">
                  {availableAssets.length === 0 
                    ? 'No available assets in this project'
                    : 'No assets match your search'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {availableAssets.length === 0 
                    ? 'All assets are already linked to milestones or tasks'
                    : 'Try adjusting your search'}
                </p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredAvailable.map((asset) => {
                  const latestVersion = asset.latestVersion;
                  const statusInfo = latestVersion ? versionStatusConfig[latestVersion.status] : versionStatusConfig.DRAFT;
                  const stageLabel = asset.productionStage ? getStageLabel(asset.productionStage) : null;

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-zinc-900 rounded-lg shrink-0">
                          {assetTypeIcons[asset.type] || <File className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-zinc-200 truncate">{asset.name}</h4>
                            {stageLabel && (
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                                {stageLabel}
                              </Badge>
                            )}
                            <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[9px]`}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span>{asset.type}</span>
                            <span>•</span>
                            <span>v{latestVersion?.versionNo || 0}</span>
                            {asset.conceptName && (
                              <>
                                <span>•</span>
                                <span>{asset.conceptName}</span>
                              </>
                            )}
                            {latestVersion?.fileSize && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(latestVersion.fileSize)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleLinkAsset(asset.id)}
                        disabled={linking === asset.id}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white ml-2 shrink-0"
                      >
                        {linking === asset.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5 mr-1.5" />
                            Link
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
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