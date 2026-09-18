// components/milestones/ReviewsList.tsx
'use client';

import { MessageSquare, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ReviewItem {
  id: string;
  reviewLinkStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  overallStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUIRED' | 'PARTIALLY_APPROVED';
  isActive: boolean;
  reviewedAt: string | null;
  reviewerName: string | null;
  createdAt: string;
  conceptName: string;
  conceptId: string;
  reviewNotes: string | null;
  sectionStatuses?: Record<string, string>;
  assetApprovals: {
    id: string;
    status: string;
    feedback: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
  }[];
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

interface ReviewsListProps {
  reviews: ReviewItem[];
  reviewStats?: {
    total: number;
    active: number;
    completed: number;
  };
}

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
  };
  return configs[status] || configs.PENDING;
};

// Extract milestone ID from reviewNotes
const extractMilestoneFromNotes = (reviewNotes: string | null): { milestoneName: string; milestoneId: string; feedback: string } | null => {
  if (!reviewNotes) return null;
  
  try {
    // Parse the JSON-like string
    const parsed = JSON.parse(reviewNotes);
    
    // Look for milestones key
    if (parsed.milestones) {
      // Extract milestone name and feedback from "milestones":"new: Feedback"
      const milestoneText = parsed.milestones;
      const parts = milestoneText.split(':');
      if (parts.length >= 2) {
        const milestoneName = parts[0].trim();
        const feedback = parts.slice(1).join(':').trim();
        
        // Find the milestone ID from sectionStatuses
        // The milestone ID is in the format "milestone-{id}"
        return {
          milestoneName,
          milestoneId: '', // We'll find this from sectionStatuses
          feedback,
        };
      }
    }
    
    // Also check if milestones key exists as a string
    if (parsed.milestones && typeof parsed.milestones === 'string') {
      const parts = parsed.milestones.split(':');
      if (parts.length >= 2) {
        return {
          milestoneName: parts[0].trim(),
          milestoneId: '',
          feedback: parts.slice(1).join(':').trim(),
        };
      }
    }
  } catch {
    // If JSON parsing fails, try to extract from the string
    const milestoneMatch = reviewNotes.match(/"milestones":"([^"]+)"/);
    if (milestoneMatch) {
      const parts = milestoneMatch[1].split(':');
      if (parts.length >= 2) {
        return {
          milestoneName: parts[0].trim(),
          milestoneId: '',
          feedback: parts.slice(1).join(':').trim(),
        };
      }
    }
  }
  
  return null;
};

// Extract milestone reviews from sectionStatuses and reviewNotes
const extractMilestoneReviews = (reviews: ReviewItem[]): {
  review: ReviewItem;
  milestoneId: string;
  milestoneName: string;
  status: string;
  feedback: string;
}[] => {
  const result: {
    review: ReviewItem;
    milestoneId: string;
    milestoneName: string;
    status: string;
    feedback: string;
  }[] = [];

  reviews.forEach((review) => {
    // First, try to get milestone info from sectionStatuses
    let milestoneId = '';
    let status = '';
    
    if (review.sectionStatuses) {
      Object.entries(review.sectionStatuses).forEach(([key, value]) => {
        if (key.startsWith('milestone-')) {
          milestoneId = key.replace('milestone-', '');
          status = value;
        }
      });
    }

    // Try to get milestone name and feedback from reviewNotes
    const milestoneInfo = extractMilestoneFromNotes(review.reviewNotes);
    const milestoneName = milestoneInfo?.milestoneName || 'Milestone';
    const feedback = milestoneInfo?.feedback || review.reviewNotes || '';

    // If we found a milestone, add it to results
    if (milestoneId || milestoneInfo) {
      result.push({
        review,
        milestoneId: milestoneId || 'unknown',
        milestoneName,
        status: status || review.overallStatus || 'PENDING',
        feedback,
      });
    }
  });

  return result;
};

export function ReviewsList({ reviews, reviewStats }: ReviewsListProps) {
  // Extract only milestone reviews
  const milestoneReviews = extractMilestoneReviews(reviews);

  if (milestoneReviews.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
        <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 font-medium">No milestone reviews yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Reviews will appear when milestone assets are sent to clients.</p>
      </div>
    );
  }

  // Calculate stats for milestone reviews
  const totalMilestoneReviews = milestoneReviews.length;
  const activeMilestoneReviews = milestoneReviews.filter(mr => mr.review.isActive).length;
  const completedMilestoneReviews = milestoneReviews.filter(mr => 
    mr.status === 'APPROVED' || mr.status === 'REJECTED'
  ).length;

  return (
    <div className="space-y-4">
      {/* Milestone Review Stats Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center gap-4 text-xs flex-wrap">
        <span className="text-zinc-400">Milestone Reviews:</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {completedMilestoneReviews} completed
        </span>
        <span className="text-blue-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {activeMilestoneReviews} active
        </span>
        <span className="text-zinc-500">• {totalMilestoneReviews} total</span>
      </div>

      <div className="space-y-3">
        {milestoneReviews.map(({ review, milestoneId, milestoneName, status, feedback }, index) => {
          const statusConfig = getReviewStatusConfig(status);
          
          return (
            <div
              key={`${milestoneId}-${index}`}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">
                      {milestoneName}
                    </span>
                    <Badge className={`text-[10px] ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                    {review.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px]">
                        Inactive
                      </Badge>
                    )}
                    <span className="text-xs text-zinc-500">
                      {review.conceptName}
                    </span>
                  </div>

                  {/* Milestone ID */}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">
                      ID: {milestoneId.slice(0, 8)}
                    </span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-500">
                      {review.reviewedAt 
                        ? new Date(review.reviewedAt).toLocaleDateString() 
                        : 'Pending review'}
                    </span>
                  </div>

                  {/* Feedback */}
                  {feedback && (
                    <div className="mt-2 p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                      <p className="text-xs text-zinc-300">
                        <span className="text-zinc-500">Feedback:</span> {feedback}
                      </p>
                    </div>
                  )}

                  {/* Reviewer */}
                  {review.reviewerName && (
                    <p className="text-sm text-zinc-400 mt-2">
                      Reviewed by: {review.reviewerName}
                    </p>
                  )}

                  {/* Asset Approvals Summary */}
                  {review.summary && review.summary.total > 0 && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {review.summary.approved} approved
                      </span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {review.summary.rejected} revisions
                      </span>
                      <span className="text-blue-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {review.summary.pending} pending
                      </span>
                      <span>• {review.summary.total} total</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {milestoneId !== 'unknown' && (
                    <Link href={`/dashboard/milestones/${milestoneId}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
                        title="View Milestone"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Created: {new Date(review.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}