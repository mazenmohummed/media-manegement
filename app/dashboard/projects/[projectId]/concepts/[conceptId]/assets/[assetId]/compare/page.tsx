'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
  Download,
  RefreshCw,
  GitCompare,
  MessageSquare,
  User,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Version {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: 'DRAFT' | 'CLIENT_REVIEW' | 'INTERNAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED';
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: {
    id: string;
    name: string;
    role: string;
  } | null;
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
  REVISIONS_REQUIRED: {
    label: 'Revisions Required',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

export default function AssetComparePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const conceptId = params?.conceptId as string;
  const assetId = params?.assetId as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionA, setVersionA] = useState<number>(1);
  const [versionB, setVersionB] = useState<number>(2);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedVersionForFeedback, setSelectedVersionForFeedback] = useState<string | null>(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  const assetType = asset?.type || 'IMAGE';
  const isImageType = ['MOODBOARD', 'STORYBOARD', 'MOCKUP', 'IMAGE'].includes(assetType);
  const isVideoType = ['VIDEO'].includes(assetType);
  const isAudioType = ['AUDIO'].includes(assetType);

  useEffect(() => {
    fetchVersions();
  }, [assetId, versionA, versionB]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/compare?versionA=${versionA}&versionB=${versionB}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Asset or versions not found');
          router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}?tab=assets`);
          return;
        }
        throw new Error('Failed to fetch versions');
      }
      const data = await response.json();
      setAsset(data);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedVersionForFeedback || !feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/${selectedVersionForFeedback}`,
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
      setFeedback('');
      setSelectedVersionForFeedback(null);
      setShowFeedbackPanel(false);
      await fetchVersions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleApproveVersion = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve version');
      }

      toast.success('Version approved');
      await fetchVersions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve version');
    }
  };

  const handleRejectVersion = async (versionId: string) => {
    setSelectedVersionForFeedback(versionId);
    setShowFeedbackPanel(true);
  };

  const renderImageDiff = (versionA: Version, versionB: Version) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionA.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionA.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
            <img
              src={versionA.fileUrl}
              alt={`Version ${versionA.versionNo}`}
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionB.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionB.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
            <img
              src={versionB.fileUrl}
              alt={`Version ${versionB.versionNo}`}
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderVideoDiff = (versionA: Version, versionB: Version) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionA.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionA.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
            <video
              src={versionA.fileUrl}
              controls
              className="w-full max-h-[400px]"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionB.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionB.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
            <video
              src={versionB.fileUrl}
              controls
              className="w-full max-h-[400px]"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    );
  };

  const renderAudioDiff = (versionA: Version, versionB: Version) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionA.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionA.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <audio
              src={versionA.fileUrl}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionB.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionB.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <audio
              src={versionB.fileUrl}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentDiff = (versionA: Version, versionB: Version) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionA.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionA.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 text-center">
            <File className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-500 mt-2">Document Preview</p>
            <a
              href={versionA.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 mt-2"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Version {versionB.versionNo}</span>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
              {format(new Date(versionB.createdAt), 'MMM d, yyyy')}
            </Badge>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 text-center">
            <File className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-500 mt-2">Document Preview</p>
            <a
              href={versionB.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 mt-2"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderDiffContent = () => {
    if (!asset || asset.versions.length !== 2) {
      return (
        <div className="text-center py-12 text-zinc-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select two versions to compare</p>
        </div>
      );
    }

    const [vA, vB] = asset.versions;

    if (isImageType) {
      return renderImageDiff(vA, vB);
    } else if (isVideoType) {
      return renderVideoDiff(vA, vB);
    } else if (isAudioType) {
      return renderAudioDiff(vA, vB);
    } else {
      return renderDocumentDiff(vA, vB);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading comparison...
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-zinc-100">No versions found</h2>
        <p className="mt-2 text-zinc-500">This asset doesn't have enough versions to compare.</p>
      </div>
    );
  }

  const allVersions = asset.versions;

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
        <Link
          href={`/dashboard/projects/${projectId}/concepts/${conceptId}/assets/${assetId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {asset.name}
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-300 font-medium">Compare</span>
      </nav>

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
              <GitCompare className="w-6 h-6 text-blue-400" />
              Version Comparison
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {asset.name} • {asset.type.replace('_', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={versionA}
              onChange={(e) => setVersionA(parseInt(e.target.value))}
              className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.versionNo}>
                  Version {v.versionNo}
                </option>
              ))}
            </select>
            <span className="text-zinc-500 text-xs">vs</span>
            <select
              value={versionB}
              onChange={(e) => setVersionB(parseInt(e.target.value))}
              className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.versionNo}>
                  Version {v.versionNo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Compare Content ────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {renderDiffContent()}
      </div>

      {/* ─── Version Details ────────────────────────────────────────────────── */}
      {asset.versions.length === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {asset.versions.map((version) => {
            const status = versionStatusConfig[version.status];
            return (
              <div key={version.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Version {version.versionNo}
                  </h3>
                  <Badge className={`${status.bg} border font-mono ${status.color}`}>
                    <span className="flex items-center gap-1">
                      {status.icon}
                      {status.label}
                    </span>
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(version.createdAt), 'PPP p')}
                  </div>
                  {version.reviewedBy && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Reviewed by {version.reviewedBy.name}
                    </div>
                  )}
                  {version.feedback && (
                    <div className="mt-2 p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                      <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                        <MessageSquare className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                        {version.feedback}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                    <a
                      href={version.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                    {version.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleApproveVersion(version.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectVersion(version.id)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Request Revisions
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Feedback Panel ─────────────────────────────────────────────────── */}
      {showFeedbackPanel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <MessageSquare className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Request Revisions</h2>
                <p className="text-xs text-zinc-500">Provide feedback for Version {asset?.versions.find(v => v.id === selectedVersionForFeedback)?.versionNo}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Feedback <span className="text-red-400">*</span>
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={4}
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowFeedbackPanel(false);
                    setFeedback('');
                    setSelectedVersionForFeedback(null);
                  }}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback || !feedback.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}