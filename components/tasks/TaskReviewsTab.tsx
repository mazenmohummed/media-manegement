// components/tasks/TaskReviewsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Link2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface ReviewApproval {
  id: string;
  status: string;
  feedback: string | null;
  generalFeedback: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  reviewNotes?: any;
  sectionStatuses?: Record<string, string> | null;
  reviewLink: {
    id: string;
    token: string;
    status: string;
    isActive: boolean;
    reviewedAt: string | null;
    reviewNotes?: string | null;
    createdAt: string;
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

const PAGE_SIZE = 5;

const getReviewStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    APPROVED: {
      label: 'Approved',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    REVISIONS_REQUIRED: {
      label: 'Revisions Needed',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    REVISIONS_REQUESTED: {
      label: 'Revisions Needed',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    PARTIALLY_APPROVED: {
      label: 'Partially Approved',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: <Clock className="w-3 h-3" />,
    },
    PENDING: {
      label: 'Pending',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      icon: <Clock className="w-3 h-3" />,
    },
    REJECTED: {
      label: 'Rejected',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  return configs[status] || configs.PENDING;
};

// Parse the raw reviewNotes JSON string
function parseReviewNotes(reviewNotes: string | null | undefined): Record<string, any> | null {
  if (!reviewNotes) return null;
  try {
    const parsed = JSON.parse(reviewNotes);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

// Extract task-specific feedback from reviewNotes.tasks
const extractTaskFromNotes = (reviewNotes: string | null): { taskName: string; feedback: string } | null => {
  if (!reviewNotes) return null;
  const parsed = parseReviewNotes(reviewNotes);
  if (!parsed) return null;

  const tasksText = parsed.tasks;
  if (!tasksText || typeof tasksText !== 'string') return null;

  const colonIndex = tasksText.indexOf(':');
  if (colonIndex === -1) return { taskName: 'Task Feedback', feedback: tasksText.trim() };

  const rawName = tasksText.substring(0, colonIndex).trim();
  const feedback = tasksText.substring(colonIndex + 1).trim();

  // Use "Task Feedback" because "try" is not a real task name
  const taskName = rawName.length < 10 ? 'Task Feedback' : rawName; 

  return { taskName, feedback };
};
// Extract task reviews from sectionStatuses and reviewNotes
const extractTaskReviews = (approvals: ReviewApproval[], taskId: string): {
  approval: ReviewApproval;
  taskId: string;
  taskName: string;
  status: string;
  feedback: string;
  conceptName: string;
  isActive: boolean;
  reviewedAt: string | null;
  reviewerName: string | null;
  createdAt: string;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}[] => {
  const result: {
    approval: ReviewApproval;
    taskId: string;
    taskName: string;
    status: string;
    feedback: string;
    conceptName: string;
    isActive: boolean;
    reviewedAt: string | null;
    reviewerName: string | null;
    createdAt: string;
    summary: {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
    };
  }[] = [];

    approvals.forEach((approval) => {
    // 1. Parse notes (Handle both direct and nested data)
    // If the API returns ReviewLink directly, use approval.reviewNotes
    // If it returns ReviewApproval, use approval.reviewLink.reviewNotes
    const rawNotes = (approval as any).reviewNotes || approval.reviewLink?.reviewNotes || null;
    const parsed = parseReviewNotes(rawNotes);
    
    // 2. Get REAL task status and ID from sectionStatuses
    let taskStatus = '';
    let taskIdFound = '';
    
    // Handle sectionStatuses from either location
    const sectionStatuses = (approval as any).sectionStatuses || parsed?.sectionStatuses || null;
    
    if (sectionStatuses && typeof sectionStatuses === 'object') {
      Object.entries(sectionStatuses as Record<string, unknown>).forEach(([key, value]) => {
        if (key.startsWith('task-')) {
          taskIdFound = key.replace('task-', '');
          taskStatus = typeof value === 'string' ? value : String(value ?? '');
        }
      });
    }

    // 3. Get Task Info from Notes
    let taskInfo = extractTaskFromNotes(rawNotes);
    
    // 4. Check if this review belongs to the current taskId
    // We ONLY care if the taskIdFound (from sectionStatuses) matches the passed taskId
    const matchesTask = (taskIdFound === taskId) || (taskInfo?.taskName === taskId);

    // IMPORTANT: We push if we found a task or it matches
    if (matchesTask || taskIdFound) { 
      const createdAt = approval.reviewLink?.createdAt || (approval as any).createdAt || approval.approvedAt || new Date().toISOString();
      const status = taskStatus || approval.status || 'PENDING';

      result.push({
        approval,
        taskId: taskIdFound || taskId,
        taskName: taskInfo?.taskName || 'Task Feedback',
        status: status,
        feedback: taskInfo?.feedback || approval.feedback || '',
        conceptName: approval.reviewLink?.concept?.name || 'Concept',
        isActive: approval.reviewLink?.isActive ?? true,
        reviewedAt: approval.reviewLink?.reviewedAt || null,
        reviewerName: parsed?.reviewerName || null,
        createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
        summary: {
          total: 1,
          approved: approval.status === 'APPROVED' ? 1 : 0,
          rejected: approval.status === 'REJECTED' || approval.status === 'REVISIONS_REQUIRED' || approval.status === 'REVISIONS_REQUESTED' ? 1 : 0,
          pending: approval.status === 'PENDING' ? 1 : 0,
        },
      });
    }
  });

  return result;
};
export function TaskReviewsTab({ taskId, taskConcepts = [] }: TaskReviewsTabProps) {
  const [approvals, setApprovals] = useState<ReviewApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTaskReviews();
  }, [taskId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

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

  // Extract task reviews
  const taskReviews = extractTaskReviews(approvals, taskId);

  // Filter task reviews
  const filteredReviews = taskReviews.filter(item => {
    const matchesSearch = 
      item.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.feedback.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.conceptName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReviews = filteredReviews.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Calculate stats
  const totalReviews = taskReviews.length;
  const approvedCount = taskReviews.filter(item => item.status === 'APPROVED').length;
  const rejectedCount = taskReviews.filter(item => 
    item.status === 'REJECTED' || 
    item.status === 'REVISIONS_REQUIRED' || 
    item.status === 'REVISIONS_REQUESTED'
  ).length;
  const pendingCount = taskReviews.filter(item => item.status === 'PENDING').length;
  const completionRate = totalReviews > 0 ? ((approvedCount / totalReviews) * 100) : 0;

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
          <p className="text-2xl font-bold text-zinc-100">{totalReviews}</p>
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
            placeholder="Search task reviews..."
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
          <option value="REVISIONS_REQUIRED">Revisions</option>
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

      {/* Task Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">
            {taskReviews.length === 0 ? 'No task reviews found' : 'No task reviews match your filters'}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            {taskReviews.length === 0 
              ? 'Task reviews appear when creative assets are reviewed by clients'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedReviews.map((item, index) => {
              const statusConfig = getReviewStatusConfig(item.status);
              
              return (
                <div
                  key={`${item.taskId}-${index}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">
                          {item.taskName}
                        </span>
                        <Badge className={`text-[10px] ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                        {item.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px]">
                            Inactive
                          </Badge>
                        )}
                        <span className="text-xs text-zinc-500">
                          {item.conceptName}
                        </span>
                      </div>

                      {/* Task ID */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-mono">
                          Task ID: {item.taskId.slice(0, 8)}
                        </span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500">
                          {item.reviewedAt 
                            ? new Date(item.reviewedAt).toLocaleDateString() 
                            : 'Pending review'}
                        </span>
                      </div>

                      {/* Feedback */}
                      {item.feedback && (
                        <div className="mt-2 p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                          <p className="text-xs text-zinc-300">
                            <span className="text-zinc-500">Feedback:</span> {item.feedback}
                          </p>
                        </div>
                      )}

                      {/* Reviewer */}
                      {item.reviewerName && (
                        <p className="text-sm text-zinc-400 mt-2 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Reviewed by: {item.reviewerName}
                        </p>
                      )}

                      {/* Asset Approval Summary */}
                      {item.summary && item.summary.total > 0 && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {item.summary.approved} approved
                          </span>
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {item.summary.rejected} revisions
                          </span>
                          <span className="text-blue-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.summary.pending} pending
                          </span>
                          <span>• {item.summary.total} total</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Link href={`/dashboard/tasks/${item.taskId}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
                          title="View Task"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    Created: {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}
                –{Math.min(safePage * PAGE_SIZE, filteredReviews.length)} of {filteredReviews.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                      page === safePage
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}