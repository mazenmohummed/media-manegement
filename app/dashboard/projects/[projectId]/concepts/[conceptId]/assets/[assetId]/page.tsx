'use client';

import { useState, useEffect, useRef  } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Upload,
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
  Edit,
  Trash2,
  RefreshCw,
  GitCompare,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Version {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED';
  feedback: string | null;
  createdAt: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  versions: Version[];
  concept: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

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
};

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const conceptId = params?.conceptId as string;
  const assetId = params?.assetId as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAsset();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Asset not found');
          router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}?tab=assets`);
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

  const handleDeleteAsset = async () => {
    if (!confirm('Are you sure you want to delete this asset and all its versions?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      toast.success('Asset deleted successfully');
      router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}?tab=assets`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload version');
      }

      toast.success('New version uploaded successfully');
      await fetchAsset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload version');
    } finally {
      setUploadingVersion(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteVersion = async (versionId: string, versionNo: number) => {
    if (!confirm(`Are you sure you want to delete version ${versionNo}?`)) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/${versionId}`,
        { method: 'DELETE' }
      );

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

  const handleVersionStatusChange = async (versionId: string, status: Version['status']) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update version status');
      }

      toast.success(`Version status updated to ${status.replace('_', ' ')}`);
      await fetchAsset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update version status');
    }
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
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
          Project
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}?tab=concepts`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Concepts
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}/concepts/${conceptId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {asset.concept.name}
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-300 font-medium truncate max-w-[200px]">
          {asset.name}
        </span>
      </nav>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-zinc-800 rounded-lg">
              {assetIcon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{asset.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                <span>{asset.type.replace('_', ' ')}</span>
                <span>•</span>
                <span>{asset.versions.length} versions</span>
                <span>•</span>
                <span>Updated {format(new Date(asset.updatedAt), 'PPP')}</span>
              </div>
            </div>
          </div>
         // In the header section of AssetDetailPage
        <div className="flex flex-wrap items-center gap-2">
        <Link href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/compare`}>
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
            <div className="flex items-center gap-3">
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
              <a
                href={latestVersion.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-blue-400" />
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
                      </div>
                      {version.feedback && (
                        <p className="text-xs text-zinc-400 mt-2">{version.feedback}</p>
                      )}
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {format(new Date(version.createdAt), 'PPP p')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={version.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
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
    </div>
  );
}