// components/tasks/TaskReviewsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  Calendar,
  User,
  FileText,
  Image,
  Video,
  Music,
  File,
  ChevronDown,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Link2,
  Copy,
  Send,
  Filter,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import toast from 'react-hot-toast';

interface ReviewApproval {
  id: string;
  status: string;
  feedback: string | null;
  generalFeedback: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  reviewLink: {
    id: string;
    token: string;
    status: string;
    isActive: boolean;
    reviewedAt: string | null;
    client: {
      clientName: string;
      email: string | null;
    };
    concept: {
      id: string;
      name: string;
    };
  };
  creativeAsset: {
    id: string;
    name: string;
    type: string;
  };
  creativeAssetVersion: {
    id: string;
    versionNo: number;
    fileUrl: string | null;
    createdAt: string;
  } | null;
}

interface TaskReviewsTabProps {
  taskId: string;
  taskConcepts?: Array<{ id: string; name: string }>;
}

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

export function TaskReviewsTab({ taskId, taskConcepts = [] }: TaskReviewsTabProps) {
  const [approvals, setApprovals] = useState<ReviewApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskReviews();
  }, [taskId]);

  const fetchTaskReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setApprovals(data);
    } catch (error) {
      console.error('Error fetching task reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReviewLink = (token: string) => {
    const url = `${window.location.origin}/client-review/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Review link copied to clipboard!');
  };

  const toggleExpand = (id: string) => {
    setExpandedApproval(expandedApproval === id ? null : id);
  };

  // Filter approvals
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = 
      approval.creativeAsset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.reviewLink.concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.reviewLink.client.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalApprovals = approvals.length;
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter(a => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED').length;
  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
  const completionRate = totalApprovals > 0 ? ((approvedCount / totalApprovals) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
          <p className="text-2xl font-bold text-zinc-100">{totalApprovals}</p>
          <p className="text-xs text-zinc-400">Total Reviews</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
          <p className="text-xs text-zinc-400">Approved</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-2xl font-bold text-amber-400">{rejectedCount}</p>
          <p className="text-xs text-zinc-400">Revisions</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-2xl font-bold text-blue-400">{pendingCount}</p>
          <p className="text-xs text-zinc-400">Pending</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-zinc-400">Approval Progress</span>
          <span className="text-zinc-200 font-medium">{completionRate.toFixed(0)}%</span>
        </div>
        <Progress value={completionRate} className="h-2 bg-zinc-700/50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="REVISIONS_REQUESTED">Revisions</option>
          <option value="PENDING">Pending</option>
        </select>
        <Button
          onClick={fetchTaskReviews}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Reviews List */}
      {filteredApprovals.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">
            {approvals.length === 0 ? 'No reviews found for this task' : 'No reviews match your filters'}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            {approvals.length === 0 
              ? 'Reviews appear when creative assets are reviewed by clients'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => {
            const statusInfo = statusConfig[approval.status as keyof typeof statusConfig] || statusConfig.PENDING;
            const isExpanded = expandedApproval === approval.id;
            const version = approval.creativeAssetVersion;

            return (
              <div
                key={approval.id}
                className={`bg-zinc-800/50 border rounded-xl overflow-hidden ${statusInfo.border}`}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => toggleExpand(approval.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-700/50 rounded-lg shrink-0">
                          {assetTypeIcons[approval.creativeAsset.type] || <File className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-zinc-100 truncate">
                            {approval.creativeAsset.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span>{approval.reviewLink.concept.name}</span>
                            <span>•</span>
                            <span>{approval.reviewLink.client.clientName}</span>
                            {version && (
                              <>
                                <span>•</span>
                                <span>v{version.versionNo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                        <span className="flex items-center gap-1 text-[10px]">
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </Badge>
                      {approval.approvedAt && (
                        <span className="text-xs text-zinc-500">
                          {format(new Date(approval.approvedAt), 'MMM d')}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-700/50 p-4 space-y-4">
                    {/* Feedback */}
                    {approval.feedback && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Feedback</p>
                        <div className="bg-zinc-900/50 rounded-lg p-3 text-sm text-zinc-200">
                          {approval.feedback}
                        </div>
                      </div>
                    )}

                    {approval.generalFeedback && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">General Feedback</p>
                        <div className="bg-zinc-900/50 rounded-lg p-3 text-sm text-zinc-200">
                          {approval.generalFeedback}
                        </div>
                      </div>
                    )}

                    {/* Review Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-zinc-900/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-400">Review Link</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-zinc-300 truncate flex-1">
                            {approval.reviewLink.token}
                          </code>
                          <Button
                            onClick={() => handleCopyReviewLink(approval.reviewLink.token)}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-zinc-400 hover:text-zinc-200"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <a
                            href={`/client-review/${approval.reviewLink.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      {approval.approvedBy && (
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-400">Reviewed By</p>
                          <p className="text-zinc-200 font-medium mt-1">{approval.approvedBy}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700/50">
                      <a
                        href={`/client-review/${approval.reviewLink.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          Open Review
                        </Button>
                      </a>
                      <Button
                        onClick={() => handleCopyReviewLink(approval.reviewLink.token)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}