// components/projects/tabs/CreativeAssetsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Music, 
  File,
  Download,
  ExternalLink,
  Trash2,
  Edit2,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Grid3x3,
  List,
  Search,
  Filter,
  Link2,
  Share2,
  Send,
  Copy,
  Check
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { ReviewLinkDialog } from '@/components/projects/ReviewLinkDialog';
import toast from 'react-hot-toast';

// ✅ Define all interfaces
interface CreativeAsset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  conceptId: string;
  createdAt: string;
  updatedAt: string;
  versions: CreativeAssetVersion[];
  latestVersion: CreativeAssetVersion | null;
  reviewLinkAssetApprovals: ReviewApproval[];
}

interface CreativeAssetVersion {
  id: string;
  versionNo: number;
  status: string;
  fileUrl: string | null;
  localFileUrl: string | null;
  cloudFileUrl: string | null;
  isSyncedToCloud: boolean;
  primaryStorage: string;
  fileSize: bigint | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    name: string;
  } | null;
}

interface ReviewApproval {
  id: string;
  status: string;
  feedback: string | null;
  generalFeedback: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

interface Concept {
  id: string;
  name: string;
}

interface CreativeAssetsTabProps {
  projectId: string;
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  MOODBOARD: <Image className="w-5 h-5" />,
  STORYBOARD: <Image className="w-5 h-5" />,
  SCRIPT: <FileText className="w-5 h-5" />,
  COPY: <FileText className="w-5 h-5" />,
  MOCKUP: <Image className="w-5 h-5" />,
  VIDEO: <Video className="w-5 h-5" />,
  IMAGE: <Image className="w-5 h-5" />,
  AUDIO: <Music className="w-5 h-5" />,
  DOCUMENT: <File className="w-5 h-5" />,
  OTHER: <File className="w-5 h-5" />,
};

const statusConfig = {
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  REVISIONS_REQUESTED: {
    label: 'Revisions',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  PENDING: {
    label: 'Pending',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
};

export function CreativeAssetsTab({ projectId }: CreativeAssetsTabProps) {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareWithClient, setShareWithClient] = useState(false);
  
  // ✅ State for review link dialog
  const [reviewLinkData, setReviewLinkData] = useState<{ link: string; assetCount: number } | null>(null);

  // Fetch assets and concepts
  useEffect(() => {
    fetchAssets();
    fetchConcepts();
  }, [projectId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/creative-assets`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      // ✅ Ensure data is an array
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load creative assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConcepts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts`);
      if (!response.ok) throw new Error('Failed to fetch concepts');
      const data = await response.json();
      // ✅ Ensure data is an array
      setConcepts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching concepts:', error);
      setConcepts([]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedConcept) {
      toast.error('Please select a file and concept');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('conceptId', selectedConcept);
    formData.append('shareWithClient', String(shareWithClient));

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      toast.success('File uploaded successfully!');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedConcept('');
      fetchAssets();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // ✅ Generate review link with dialog
  const handleGenerateReviewLink = async (conceptId: string) => {
    try {
      const loadingToast = toast.loading('Generating review link...');
      
      const response = await fetch(`/api/projects/${projectId}/concepts/${conceptId}/review-link`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate review link');
      }
      
      const data = await response.json();
      toast.dismiss(loadingToast);
      
      // ✅ Show the dialog with the link
      setReviewLinkData({
        link: data.link,
        assetCount: data.assetCount || 0
      });
      
      // Refresh assets to update status
      setTimeout(() => fetchAssets(), 1000);
      
    } catch (error) {
      console.error('Error generating review link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate review link');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesConcept = filterConcept === 'all' || asset.conceptId === filterConcept;
    const latestVersion = asset.latestVersion;
    const matchesStatus = filterStatus === 'all' || 
                         (latestVersion && latestVersion.status === filterStatus);
    return matchesSearch && matchesConcept && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">Creative Assets</h2>
            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
              {assets.length} assets
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                  <DialogTitle>Upload Creative Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Concept</label>
                    <select
                      value={selectedConcept}
                      onChange={(e) => setSelectedConcept(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a concept...</option>
                      {concepts.map((concept) => (
                        <option key={concept.id} value={concept.id}>
                          {concept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">File</label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="shareWithClient"
                      checked={shareWithClient}
                      onChange={(e) => setShareWithClient(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                    />
                    <label htmlFor="shareWithClient" className="text-sm text-zinc-400">
                      Share with client immediately
                    </label>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !selectedConcept}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload Asset'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <select
            value={filterConcept}
            onChange={(e) => setFilterConcept(e.target.value)}
            className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Concepts</option>
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Assets Grid/List */}
        {filteredAssets.length === 0 ? (
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
            <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No creative assets found</p>
            <p className="text-sm text-zinc-500 mt-1">Upload your first asset to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const latestVersion = asset.latestVersion;
              const statusInfo = statusConfig[latestVersion?.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const concept = concepts.find(c => c.id === asset.conceptId);

              return (
                <div
                  key={asset.id}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors"
                >
                  <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                    {latestVersion?.fileUrl ? (
                      latestVersion.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                        <img
                          src={latestVersion.fileUrl}
                          alt={asset.name}
                          className="w-full h-full object-contain"
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
                        <span className="text-xs">No file uploaded</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-zinc-100 truncate">{asset.name}</h4>
                        <p className="text-xs text-zinc-400">{concept?.name || 'Uncategorized'}</p>
                      </div>
                      <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                        <span className="flex items-center gap-1">
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>v{latestVersion?.versionNo || 0}</span>
                      <span>{latestVersion ? format(new Date(latestVersion.createdAt), 'MMM d, yyyy') : 'No version'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
                      {latestVersion?.fileUrl && (
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
                      <button
                        onClick={() => handleGenerateReviewLink(asset.conceptId)}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-auto"
                      >
                        <Send className="w-3 h-3" />
                        Review
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
              const statusInfo = statusConfig[latestVersion?.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const concept = concepts.find(c => c.id === asset.conceptId);

              return (
                <div
                  key={asset.id}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:bg-zinc-800/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-900 rounded-lg">
                      {assetTypeIcons[asset.type] || <File className="w-5 h-5 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-100 truncate">{asset.name}</h4>
                        <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} text-[10px]`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400">{concept?.name || 'Uncategorized'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>v{latestVersion?.versionNo || 0}</span>
                      <span>{latestVersion ? format(new Date(latestVersion.createdAt), 'MMM d, yyyy') : 'No version'}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                        onClick={() => handleGenerateReviewLink(asset.conceptId)}
                        className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4 text-purple-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Review Link Dialog */}
      {reviewLinkData && (
        <ReviewLinkDialog
          open={!!reviewLinkData}
          onOpenChange={(open) => !open && setReviewLinkData(null)}
          link={reviewLinkData.link}
          assetCount={reviewLinkData.assetCount}
        />
      )}
    </>
  );
}