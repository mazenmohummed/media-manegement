'use client';

import { useState, useEffect, useRef } from 'react';
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
  Send,
  Link as LinkIcon,
  Copy,
  MessageSquare,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Mail,
  Eye,
  Award,
  FileCheck,
  FileX,
  History,
  Users,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeedbackPanel } from '@/components/assets/FeedbackPanel';

interface Version {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED';
  feedback: string | null;
  createdAt: string;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reviewedAt?: string | null;
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
  project?: {
    clientId: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Extended version status config with review-specific labels
const versionStatusConfig: Record<Version['status'], { label: string; color: string; bg: string; icon: React.ReactNode; reviewType?: string }> = {
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
    reviewType: 'client',
  },
  INTERNAL_REVIEW: {
    label: 'Internal Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
    reviewType: 'internal',
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    reviewType: 'approved',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
    reviewType: 'rejected',
  },
  REVISIONS_REQUIRED: {
    label: 'Revisions Required',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    reviewType: 'revision',
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

  // Feedback panel states
  const [selectedVersionForFeedback, setSelectedVersionForFeedback] = useState<Version | null>(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showReviewHistory, setShowReviewHistory] = useState(true);

  // Client review link states
  const [creatingReviewLink, setCreatingReviewLink] = useState(false);
  const [showReviewLinkModal, setShowReviewLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [linkDetails, setLinkDetails] = useState<{
    conceptName: string;
    assetCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Review history state
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [fullLinkToken, setFullLinkToken] = useState<string | null>(null);
  const [showFullLinkModal, setShowFullLinkModal] = useState(false);

  useEffect(() => {
    fetchAsset();
    fetchReviewHistory();
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

  const fetchReviewHistory = async () => {
    setLoadingReviews(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/reviews`
      );
      if (response.ok) {
        const data = await response.json();
        setReviewHistory(data.reviews || []);
      } else {
        console.error('Failed to fetch reviews:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching review history:', error);
    } finally {
      setLoadingReviews(false);
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
      await fetchReviewHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update version status');
    }
  };

  const handleSubmitFeedback = async (feedback: string) => {
    if (!selectedVersionForFeedback) return;

    setSubmittingFeedback(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/${selectedVersionForFeedback.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback: feedback.trim(),
            status: 'REVISIONS_REQUIRED',
          }),
        }
      );

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

  const handleSendForClientReview = async () => {
    if (!asset) return;

    setCreatingReviewLink(true);
    try {
      const conceptResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}`
      );
      if (!conceptResponse.ok) {
        const errorData = await conceptResponse.json();
        throw new Error(errorData.error || 'Failed to fetch concept details');
      }
      const conceptData = await conceptResponse.json();

      if (!conceptData.clientId) {
        throw new Error(
          'This concept is not associated with a client. ' +
          'Please ensure the project has a client assigned before creating a review link.'
        );
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
      setGeneratedLink(data.url);
      setLinkExpiry(data.expiresAt || null);
      setLinkDetails({
        conceptName: data.concept.name,
        assetCount: data.concept.assetCount,
      });
      setShowReviewLinkModal(true);

      // Auto-copy to clipboard
      await navigator.clipboard.writeText(data.url);
      toast.success('✅ Review link copied to clipboard!');
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
        // Fallback for older browsers
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

  // Get review stats
  const totalReviews = reviewHistory.length;
  const approvedReviews = reviewHistory.filter((r: any) => r.status === 'APPROVED').length;
  const rejectedReviews = reviewHistory.filter((r: any) => r.status === 'REJECTED' || r.status === 'REVISIONS_REQUIRED').length;
  const pendingReviews = reviewHistory.filter((r: any) => r.status === 'CLIENT_REVIEW' || r.status === 'INTERNAL_REVIEW').length;

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSendForClientReview}
              disabled={creatingReviewLink || !asset.versions.length}
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

      {/* Review Stats Summary */}
      {reviewHistory.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
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
                            onClick={() => {
                              setSelectedVersionForFeedback(version);
                              setShowFeedbackPanel(true);
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-full border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            Request Revisions
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

      {/* Review History Section - COMPLETE WITH ALL DETAILS */}
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
          <div className="text-center py-8 text-zinc-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">No reviews yet</p>
            <p className="text-xs text-zinc-600">Reviews will appear here when team members or clients provide feedback</p>
          </div>
        ) : showReviewHistory ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {reviewHistory.map((review: any, index: number) => {
              const isClientReview = review.type === 'CLIENT_REVIEW' || review.source === 'client' || review.source === 'review_link';
              const isInternalReview = review.type === 'INTERNAL_REVIEW' || review.source === 'internal';
              
              // Get status color
              const getStatusColor = (status: string) => {
                switch(status) {
                  case 'APPROVED': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                  case 'REJECTED': return 'text-red-400 border-red-500/20 bg-red-500/5';
                  case 'REVISIONS_REQUIRED': return 'text-orange-400 border-orange-500/20 bg-orange-500/5';
                  case 'CLIENT_REVIEW': return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
                  case 'INTERNAL_REVIEW': return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
                  default: return 'text-zinc-400 border-zinc-700/50 bg-zinc-800/20';
                }
              };

              return (
                <div
                  key={review.id || index}
                  className={`border rounded-lg p-4 transition-colors ${getStatusColor(review.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header: Review Type, Status, Version */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Review type badge */}
                        <Badge className={`text-[10px] ${
                          isClientReview 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : isInternalReview
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {isClientReview ? (
                            <>
                              <Building className="w-3 h-3 mr-1" />
                              Client Review
                            </>
                          ) : isInternalReview ? (
                            <>
                              <Users className="w-3 h-3 mr-1" />
                              Internal Review
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Review
                            </>
                          )}
                        </Badge>
                        
                        {/* Status badge */}
                        <Badge className={`text-[10px] ${
                          review.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : review.status === 'REJECTED' || review.status === 'REVISIONS_REQUIRED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {review.status === 'APPROVED' && <ThumbsUp className="w-3 h-3 mr-1" />}
                          {review.status === 'REJECTED' && <ThumbsDown className="w-3 h-3 mr-1" />}
                          {review.status === 'REVISIONS_REQUIRED' && <RotateCcw className="w-3 h-3 mr-1" />}
                          {review.status === 'CLIENT_REVIEW' && <Clock className="w-3 h-3 mr-1" />}
                          {review.status === 'INTERNAL_REVIEW' && <Clock className="w-3 h-3 mr-1" />}
                          {review.status?.replace('_', ' ')}
                        </Badge>
                        
                        {/* Version info */}
                        {review.versionNo && (
                          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono text-[9px]">
                            <FileText className="w-3 h-3 mr-1" />
                            v{review.versionNo}
                          </Badge>
                        )}

                        {/* Approval Status from ReviewLinkAssetApproval */}
                        {review.approvalStatus && (
                          <Badge className={`text-[9px] ${
                            review.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : review.approvalStatus === 'REJECTED' || review.approvalStatus === 'REVISIONS_REQUESTED'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            Approval: {review.approvalStatus?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      {/* ✅ Asset Name */}
                      {review.assetName && (
                        <div className="text-xs text-zinc-400">
                          <File className="w-3 h-3 inline mr-1" />
                          {review.assetName}
                        </div>
                      )}
                      
                      {/* ✅ Overall Review Notes (from ReviewLink) */}
                      {review.reviewNotes && (
                        <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-blue-400 font-medium">Overall Notes:</p>
                              <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">{review.reviewNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ✅ Per-Asset Feedback */}
                      {review.feedback && (
                        <div className="mt-2 p-3 bg-zinc-800/30 border border-zinc-700/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-zinc-400 font-medium">Asset Feedback:</p>
                              <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">{review.feedback}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ✅ Reviewer Information - COMPLETE DETAILS */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-zinc-500">
                        {/* Reviewer Name */}
                        <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                          <User className="w-3 h-3" />
                          {typeof review.reviewedBy === 'object' && review.reviewedBy !== null
                            ? review.reviewedBy.name || review.reviewerName || 'Unknown'
                            : review.reviewerName || review.reviewedBy || 'Unknown'}
                        </span>
                        
                        {/* Reviewer Email */}
                        {review.reviewerEmail && (
                          <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                            <Mail className="w-3 h-3" />
                            {review.reviewerEmail}
                          </span>
                        )}
                        
                        {/* Reviewer Role */}
                        {review.reviewerRole && (
                          <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                            <Award className="w-3 h-3" />
                            {review.reviewerRole}
                          </span>
                        )}

                        {/* Reviewer ID (if available) */}
                        {typeof review.reviewedBy === 'object' && review.reviewedBy?.id && (
                          <span className="text-zinc-600">ID: {review.reviewedBy.id.slice(0, 8)}</span>
                        )}
                        
                        {/* Review Date */}
                        <span className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(review.reviewedAt || review.createdAt || Date.now()), 'PPP p')}
                        </span>
                        
                        {/* Source */}
                        {isClientReview && review.source === 'review_link' && (
                          <span className="flex items-center gap-1 text-blue-400/60 bg-blue-500/5 px-2 py-1 rounded">
                            <LinkIcon className="w-3 h-3" />
                            via Review Link
                          </span>
                        )}
                        
                        {/* Creation date */}
                        <span className="text-zinc-600 bg-zinc-800/30 px-2 py-1 rounded">
                          Created: {format(new Date(review.createdAt), 'PPP p')}
                        </span>
                      </div>

                      {/* ✅ Review Link Details (if available) */}
                      {review.reviewLink && (
                        <div className="mt-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <LinkIcon className="w-3 h-3 text-purple-400" />
                            <span>Review Link:</span>
                            <span 
                              className="text-purple-400 font-mono cursor-pointer hover:text-purple-300 transition-colors hover:underline flex items-center gap-1"
                              onClick={() => {
                                setFullLinkToken(review.reviewLink.token);
                                setShowFullLinkModal(true);
                              }}
                              title="Click to view full token"
                            >
                              {review.reviewLink.token.slice(0, 12)}...
                              <ExternalLink className="w-3 h-3 opacity-50 hover:opacity-100" />
                            </span>
                            {review.reviewLink.reviewedBy && (
                              <>
                                <span>•</span>
                                <span>Reviewed by: {review.reviewLink.reviewedBy}</span>
                              </>
                            )}
                            {review.reviewLink.reviewedAt && (
                              <>
                                <span>•</span>
                                <span>Reviewed at: {format(new Date(review.reviewLink.reviewedAt), 'PPP p')}</span>
                              </>
                            )}
                          </div>
                          {review.reviewLink.reviewNotes && (
                            <div className="mt-1 text-[10px] text-zinc-400">
                              <span className="text-zinc-500">Link Notes:</span> {review.reviewLink.reviewNotes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Full Token Modal */}
                      {showFullLinkModal && fullLinkToken && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-purple-500/10 rounded-lg">
                                <LinkIcon className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-zinc-100">Full Review Token</h3>
                                <p className="text-sm text-zinc-400">Click the copy button to copy the full token</p>
                              </div>
                            </div>
                            
                            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                              <p className="text-xs text-zinc-400 mb-2">Token:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-sm text-purple-400 font-mono break-all flex-1 bg-zinc-950/50 p-2 rounded-lg">
                                  {fullLinkToken}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(fullLinkToken);
                                    toast.success('✅ Full token copied to clipboard!');
                                  }}
                                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                                  title="Copy full token"
                                >
                                  <Copy className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowFullLinkModal(false);
                                  setFullLinkToken(null);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium transition-colors"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ✅ Revision Task Info (if applicable) */}
                      {review.revisionTaskId && (
                        <div className="mt-1 text-[10px] text-orange-400/60 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Revision Task Created: {review.revisionTaskId.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    
                    {/* Actions for pending reviews */}
                    {review.status === 'CLIENT_REVIEW' && (
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleVersionStatusChange(review.versionId, 'APPROVED')}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                          title="Approve"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const version = asset?.versions.find(v => v.id === review.versionId);
                            if (version) {
                              setSelectedVersionForFeedback(version);
                              setShowFeedbackPanel(true);
                            }
                          }}
                          className="p-1.5 text-orange-400 hover:bg-orange-500/10 rounded-md transition-colors"
                          title="Request Revisions"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Feedback Panel */}
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

      {/* Review Link Modal with Copy Feedback */}
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