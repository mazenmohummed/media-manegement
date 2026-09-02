// app/client-review/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  MessageSquare,
  FileText,
  Image,
  Video,
  Music,
  File,
  User,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AssetVersion {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: string;
  feedback: string | null;
  createdAt: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  latestVersion: AssetVersion | null;
  versions: AssetVersion[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
}

interface ConceptData {
  id: string;
  name: string;
  projectName: string;
  clientName: string;
  assets: Asset[];
}

interface ReviewLinkData {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  viewCount: number;
  maxViews: number;
  reviewedAt: string | null;
  reviewNotes: string | null;
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
    label: 'Approved ✓',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  REJECTED: {
    label: 'Revisions Required',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  REVISIONS_REQUESTED: {
    label: 'Revisions Requested',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  PENDING: {
    label: 'Pending Review',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: <Clock className="w-4 h-4" />,
  },
};

export default function ClientReviewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [linkData, setLinkData] = useState<ReviewLinkData | null>(null);
  const [assetApprovals, setAssetApprovals] = useState<Record<string, string>>({});
  const [assetFeedback, setAssetFeedback] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    fetchReviewData();
  }, [token]);

  const fetchReviewData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/client-review/links/${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load review data');
      }

      const data = await response.json();
      setConcept(data.concept);
      setLinkData(data.link);

      const initialApprovals: Record<string, string> = {};
      const initialFeedback: Record<string, string> = {};
      data.concept.assets.forEach((asset: Asset) => {
        initialApprovals[asset.id] = asset.approvalStatus || 'PENDING';
        initialFeedback[asset.id] = asset.feedback || '';
      });
      setAssetApprovals(initialApprovals);
      setAssetFeedback(initialFeedback);

      if (data.link.reviewedAt) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalChange = (assetId: string, status: string) => {
    setAssetApprovals((prev) => ({ ...prev, [assetId]: status }));
  };

  const handleFeedbackChange = (assetId: string, feedback: string) => {
    setAssetFeedback((prev) => ({ ...prev, [assetId]: feedback }));
  };

  const toggleAssetExpand = (assetId: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const validateSubmission = () => {
    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    // Check if any asset is still pending
    const pendingAssets = Object.entries(assetApprovals).filter(
      ([, status]) => status === 'PENDING'
    );
    if (pendingAssets.length > 0) {
      toast.error(`Please review all assets (${pendingAssets.length} pending)`);
      return false;
    }

    // Check if any rejected asset lacks feedback
    const rejectedWithoutFeedback = Object.entries(assetApprovals)
      .filter(([assetId, status]) => 
        (status === 'REJECTED' || status === 'REVISIONS_REQUESTED') && 
        !assetFeedback[assetId]?.trim()
      );
    if (rejectedWithoutFeedback.length > 0) {
      toast.error('Please provide feedback for all rejected assets');
      return false;
    }

    return true;
  };

  const handleSubmitReview = async () => {
    if (!validateSubmission()) return;
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      const assetApprovalsArray = Object.entries(assetApprovals).map(
        ([assetId, status]) => ({
          assetId,
          status,
          feedback: assetFeedback[assetId] || null,
        })
      );

      const response = await fetch(`/api/client-review/links/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetApprovals: assetApprovalsArray,
          reviewNotes: reviewNotes.trim() || null,
          reviewerName: reviewerName.trim(),
          reviewerEmail: reviewerEmail.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      const data = await response.json();
      setSubmitted(true);
      toast.success(data.message || 'Review submitted successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400">Loading your review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 border border-red-500/20 rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Link Error</h2>
          <p className="text-slate-400">{error}</p>
          <p className="text-slate-500 text-sm mt-4">
            Please contact your agency for a new review link.
          </p>
        </div>
      </div>
    );
  }

  if (!concept || !linkData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">No Content Found</h2>
          <p className="text-slate-400">This review link doesn't have any content.</p>
        </div>
      </div>
    );
  }

  const allApproved = Object.values(assetApprovals).every(
    (status) => status === 'APPROVED'
  );
  const hasRejections = Object.values(assetApprovals).some(
    (status) => status === 'REJECTED' || status === 'REVISIONS_REQUESTED'
  );
  const hasPending = Object.values(assetApprovals).some(
    (status) => status === 'PENDING'
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700/50 py-4 px-6 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Review: {concept.name}
            </h1>
            <p className="text-sm text-slate-400">
              {concept.projectName} • {concept.clientName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {submitted ? (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Review Submitted</span>
              </div>
            ) : (
              <div className="text-sm text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {linkData.expiresAt && (
                  <span>
                    Expires: {format(new Date(linkData.expiresAt), 'PPP')}
                  </span>
                )}
                {linkData.maxViews > 0 && (
                  <span className="ml-2">
                    Views: {linkData.viewCount}/{linkData.maxViews}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {submitted ? (
          // Thank you view
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center max-w-2xl mx-auto">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              Thank You for Your Review!
            </h2>
            <p className="text-slate-400">
              Your feedback has been submitted successfully.
              {reviewNotes && (
                <span className="block mt-2 text-slate-300 text-sm">
                  Notes: "{reviewNotes}"
                </span>
              )}
            </p>
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm">
                  {Object.values(assetApprovals).filter((s) => s === 'APPROVED')
                    .length}{' '}
                  Approved
                </span>
                {hasRejections && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm">
                    {Object.values(assetApprovals).filter(
                      (s) => s === 'REJECTED' || s === 'REVISIONS_REQUESTED'
                    ).length}{' '}
                    Revisions Requested
                  </span>
                )}
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              You can close this page now. The agency will review your feedback
              and begin work on any requested revisions.
            </p>
          </div>
        ) : (
          <>
            {/* Review Instructions */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Review Instructions
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Review each asset below. You can approve it as-is or request
                    revisions with specific feedback.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Request Revisions
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Pending (default)
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Progress: {Object.values(assetApprovals).filter(s => s !== 'PENDING').length}/{concept.assets.length} reviewed
                  </span>
                  <span className="text-slate-500">
                    {hasPending ? '⚠️ Pending items remain' : '✅ All items reviewed'}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${(Object.values(assetApprovals).filter(s => s !== 'PENDING').length / concept.assets.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Assets */}
            <div className="space-y-4">
              {concept.assets.map((asset) => {
                const status = assetApprovals[asset.id] || 'PENDING';
                const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
                const isExpanded = expandedAssets.has(asset.id);
                const versions = asset.versions || [];
                const latestVersion = asset.latestVersion;

                return (
                  <div
                    key={asset.id}
                    className={`bg-slate-800/30 border rounded-xl overflow-hidden transition-colors ${
                      status === 'APPROVED'
                        ? 'border-emerald-500/20'
                        : status === 'REJECTED' || status === 'REVISIONS_REQUESTED'
                        ? 'border-amber-500/20'
                        : 'border-slate-700/50'
                    }`}
                  >
                    {/* Asset Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                      onClick={() => toggleAssetExpand(asset.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-700/50 rounded-lg shrink-0">
                          {assetTypeIcons[asset.type] || (
                            <File className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-100 truncate">
                            {asset.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{asset.type.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>v{latestVersion?.versionNo || 0}</span>
                            {latestVersion && (
                              <>
                                <span>•</span>
                                <span>
                                  {format(
                                    new Date(latestVersion.createdAt),
                                    'PPP'
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Asset Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/50 p-4 space-y-4">
                        {/* Version Preview */}
                        {latestVersion && latestVersion.fileUrl && (
                          <div className="bg-slate-900/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-400">
                                Latest Version
                              </span>
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
                            <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                              {latestVersion.fileUrl.match(
                                /\.(jpg|jpeg|png|gif|webp|svg)$/i
                              ) ? (
                                <img
                                  src={latestVersion.fileUrl}
                                  alt={asset.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : latestVersion.fileUrl.match(
                                  /\.(mp4|webm|mov)$/i
                                ) ? (
                                <video
                                  src={latestVersion.fileUrl}
                                  controls
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                                  <FileText className="w-8 h-8" />
                                  <span>Preview not available</span>
                                  <a
                                    href={latestVersion.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline text-xs"
                                  >
                                    Open file
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Version History */}
                        {versions.length > 1 && (
                          <div>
                            <button
                              className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const el = e.currentTarget.nextElementSibling;
                                if (el) {
                                  el.classList.toggle('hidden');
                                }
                              }}
                            >
                              <ChevronDown className="w-3 h-3" />
                              Version History ({versions.length})
                            </button>
                            <div className="hidden mt-2 space-y-1">
                              {versions.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between text-xs p-2 bg-slate-900/30 rounded-lg"
                                >
                                  <span className="text-slate-300 font-mono">
                                    v{v.versionNo}
                                  </span>
                                  <span className="text-slate-500">
                                    {format(new Date(v.createdAt), 'PPP p')}
                                  </span>
                                  {v.fileUrl && (
                                    <a
                                      href={v.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approval Controls */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                handleApprovalChange(asset.id, 'APPROVED')
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                assetApprovals[asset.id] === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleApprovalChange(
                                  asset.id,
                                  'REJECTED'
                                )
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                assetApprovals[asset.id] === 'REJECTED' || 
                                assetApprovals[asset.id] === 'REVISIONS_REQUESTED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                              }`}
                            >
                              <AlertCircle className="w-4 h-4" />
                              Request Revisions
                            </button>
                          </div>

                          {/* Feedback input for rejected */}
                          {(assetApprovals[asset.id] === 'REJECTED' || 
                            assetApprovals[asset.id] === 'REVISIONS_REQUESTED') && (
                            <div className="mt-2">
                              <label className="text-xs text-slate-400 block mb-1">
                                Revision feedback <span className="text-amber-400">*</span>
                              </label>
                              <textarea
                                value={assetFeedback[asset.id] || ''}
                                onChange={(e) =>
                                  handleFeedbackChange(asset.id, e.target.value)
                                }
                                placeholder="Please specify what changes are needed..."
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Existing feedback display */}
                          {asset.feedback && assetApprovals[asset.id] !== 'PENDING' && (
                            <div className="mt-2 p-3 bg-slate-900/30 rounded-lg">
                              <p className="text-xs text-slate-400">Previous feedback:</p>
                              <p className="text-sm text-slate-300 mt-0.5">{asset.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reviewer Info & Submit */}
            <div className="mt-8 bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">
                Submit Your Review
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Email (optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={reviewerEmail}
                      onChange={(e) => setReviewerEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">
                  Overall Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Any additional comments about the overall concept..."
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  rows={2}
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={submitting || hasPending}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  hasPending
                    ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : hasPending ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Please review all assets first
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Review
                  </>
                )}
              </button>

              {hasPending && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  ⚠️ {Object.values(assetApprovals).filter(s => s === 'PENDING').length} asset(s) still pending review
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Confirm Submission
            </h3>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <p>You're about to submit your review with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  {Object.values(assetApprovals).filter(s => s === 'APPROVED').length} approved assets
                </li>
                {hasRejections && (
                  <li className="text-amber-400">
                    {Object.values(assetApprovals).filter(
                      s => s === 'REJECTED' || s === 'REVISIONS_REQUESTED'
                    ).length} assets with revision requests
                  </li>
                )}
              </ul>
              {hasRejections && (
                <p className="text-amber-400/80 mt-2 text-xs">
                  ⚠️ Revisions will be automatically assigned to the creative team.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}