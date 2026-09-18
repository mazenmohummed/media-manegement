// components/projects/tabs/ReviewsTab.tsx
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
  Copy,
  Eye,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  FolderTree,
  GitBranch,
  Lightbulb,
  Search,
  LinkIcon,
  ListChecks,
  Camera,
  Clapperboard,
  Film,
  Mic,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface ReviewLink {
  id: string;
  token: string;
  status: string;
  isActive: boolean;
  expiresAt: string | null;
  viewCount: number;
  maxViews: number | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerEmail: string | null;
  reviewNotes: string | null;
  createdAt: string;
  concept: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    brief: string | null;
    project: {
      id: string;
      projectName: string;
      brief: {
        id: string;
        title: string;
        status: string;
        objectives: string;
        audience: string | null;
        keyMessage: string | null;
        deliverables: string[];
        references: string[];
        budget: number | null;
      } | null;
      client: {
        clientName: string;
        email: string | null;
      };
    };
  };
  client: {
    id: string;
    clientName: string;
    email: string | null;
    phoneNumber: string | null;
  };
  reviewLinkAssetApprovals: ReviewApproval[];
  briefApprovalStatus?: string;
  briefFeedback?: string | null;
  hasBrief?: boolean;
}

interface ReviewApproval {
  id: string;
  status: string;
  feedback: string | null;
  generalFeedback: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  creativeAsset: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    productionStage?: string | null;
    productionMetadata?: any;
  };
  creativeAssetVersion: {
    id: string;
    versionNo: number;
    fileUrl: string | null;
    localFileUrl: string | null;
    cloudFileUrl: string | null;
    createdAt: string;
    updatedAt: string;
    status: string;
    isSyncedToCloud: boolean;
    // ✅ Add these fields
    fileSize?: number | null;
    resolution?: string | null;
    duration?: number | null;
    mimeType?: string | null;
  } | null;
}

interface ReviewsTabProps {
  projectId: string;
  conceptId?: string | null;
  conceptName?: string | null;
  conceptAssets?: any[];
}

// Production stage badge component
const ProductionStageBadge = ({ stage }: { stage?: string }) => {
  if (!stage) return null;
  
  const stages: Record<string, { label: string; color: string; bg: string }> = {
    'pre-production': { label: 'Pre-Production', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'shooting': { label: 'Shooting', color: 'text-red-400', bg: 'bg-red-500/10' },
    'editing': { label: 'Editing', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    'color_grading': { label: 'Color Grading', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    'sound_design': { label: 'Sound Design', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    'motion_graphics': { label: 'Motion Graphics', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    'vfx': { label: 'VFX', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    'final_delivery': { label: 'Final Delivery', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  };

  const info = stages[stage] || { label: stage, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
  return (
    <Badge className={`${info.bg} ${info.color} border-0 text-[10px]`}>
      {info.label}
    </Badge>
  );
};

// Production metadata display component
const ProductionMetadataDisplay = ({ metadata }: { metadata?: any }) => {
  if (!metadata) return null;
  
  const fields = [
    { key: 'camera', label: 'Camera', icon: <Camera className="w-3 h-3" /> },
    { key: 'director', label: 'Director', icon: <Clapperboard className="w-3 h-3" /> },
    { key: 'dp', label: 'DP', icon: <Camera className="w-3 h-3" /> },
    { key: 'shootDate', label: 'Shoot Date', icon: <Calendar className="w-3 h-3" /> },
    { key: 'location', label: 'Location', icon: <Film className="w-3 h-3" /> },
  ];

  const hasMetadata = fields.some(f => metadata[f.key]);
  if (!hasMetadata) return null;

  return (
    <div className="mt-2 bg-zinc-800/50 p-2 rounded border border-zinc-700/30">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5">
        <Film className="w-3 h-3" />
        <span>Production Info</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {fields.map(({ key, label, icon }) => {
          const value = metadata[key];
          if (!value) return null;
          return (
            <div key={key} className="flex items-center gap-1 text-zinc-300">
              <span className="text-zinc-500">{icon}</span>
              <span className="text-zinc-400">{label}:</span>
              <span className="text-zinc-200">
                {key === 'shootDate' ? format(new Date(value), 'MMM d, yyyy') : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
  REVIEWED: {
    label: 'Reviewed',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
};

export function ReviewsTab({ 
  projectId,
  conceptId = null,
  conceptName = null,
  conceptAssets = [],
}: ReviewsTabProps){
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  const [creatingReviewLink, setCreatingReviewLink] = useState(false);
  const [showReviewLinkModal, setShowReviewLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [linkDetails, setLinkDetails] = useState<{ conceptName: string; assetCount: number; clientName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const uniqueConcepts = Array.from(new Set(reviewLinks.map(r => r.concept.name)));
  const uniqueClients = Array.from(new Set(reviewLinks.map(r => r.client.clientName)));

  useEffect(() => {
    fetchReviewLinks();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [reviewLinks, searchQuery, filterStatus, filterConcept, filterClient]);

  const fetchReviewLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/review-links`);
      if (!response.ok) throw new Error('Failed to fetch review links');
      const data = await response.json();
      setReviewLinks(data);
    } catch (error) {
      console.error('Error fetching review links:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviewLinks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => 
        review.concept.name.toLowerCase().includes(query) ||
        review.concept.project.projectName.toLowerCase().includes(query) ||
        review.client.clientName.toLowerCase().includes(query) ||
        review.reviewedBy?.toLowerCase().includes(query) ||
        review.reviewerEmail?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(review => {
        const totalAssets = review.reviewLinkAssetApprovals.length;
        const approvedCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'APPROVED').length;
        const rejectedCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED').length;
        const pendingCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'PENDING').length;
        const isComplete = pendingCount === 0;

        const hasBrief = review.hasBrief;
        const briefApproved = review.briefApprovalStatus === 'APPROVED';
        const briefRejected = review.briefApprovalStatus === 'REVISIONS_REQUESTED';
        const briefPending = review.briefApprovalStatus === 'PENDING' || review.briefApprovalStatus === 'REVIEWED';

        switch (filterStatus) {
          case 'active':
            return review.isActive;
          case 'inactive':
            return !review.isActive;
          case 'completed':
            return isComplete && review.reviewedAt !== null && (!hasBrief || briefApproved);
          case 'pending':
            return !isComplete || (hasBrief && briefPending);
          case 'approved':
            return approvedCount === totalAssets && totalAssets > 0 && (!hasBrief || briefApproved);
          case 'revisions':
            return rejectedCount > 0 || (hasBrief && briefRejected);
          default:
            return true;
        }
      });
    }

    if (filterConcept !== 'all') {
      filtered = filtered.filter(review => review.concept.name === filterConcept);
    }

    if (filterClient !== 'all') {
      filtered = filtered.filter(review => review.client.clientName === filterClient);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredReviews(filtered);
    setCurrentPage(1);
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/client-review/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Review link copied to clipboard!');
  };

  const toggleExpand = (id: string) => {
    setExpandedReview(expandedReview === id ? null : id);
  };

  // Parse review notes with all feedback sections
  const parseReviewNotes = (reviewNotes: string | null) => {
    if (!reviewNotes) return null;
    
    try {
      const parsed = JSON.parse(reviewNotes);
      if (typeof parsed === 'object') {
        return {
          overview: parsed.overview || null,
          brief: parsed.brief || null,
          overall: parsed.overall || null,
          milestones: parsed.milestones || null,
          tasks: parsed.tasks || null,
          concepts: parsed.concepts || null,
          sectionStatuses: parsed.sectionStatuses || null,
        };
      }
      return { 
        overview: null, 
        brief: null, 
        overall: reviewNotes, 
        milestones: null, 
        tasks: null,
        concepts: null,
        sectionStatuses: null,
      };
    } catch {
      return { 
        overview: null, 
        brief: null, 
        overall: reviewNotes, 
        milestones: null, 
        tasks: null,
        concepts: null,
        sectionStatuses: null,
      };
    }
  };

  // Get status for a specific item type - UPDATED to include TASKS
  const getItemStatus = (review: ReviewLink, type: string): { status: string; label: string; color: string; bg: string } => {
    const parsed = parseReviewNotes(review.reviewNotes);
    const sectionStatuses = parsed?.sectionStatuses || {};
    
    if (type === 'PROJECT' && sectionStatuses.project) {
      const status = sectionStatuses.project;
      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
      return { status, label: config.label, color: config.color, bg: config.bg };
    }
    
    if (type === 'BRIEF' && sectionStatuses.brief) {
      const status = sectionStatuses.brief;
      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
      return { status, label: config.label, color: config.color, bg: config.bg };
    }

    // ✅ TASKS - Check if there are any task statuses
    if (type === 'TASK') {
      const taskKeys = Object.keys(sectionStatuses).filter(k => k.startsWith('task-'));
      if (taskKeys.length > 0) {
        const allApproved = taskKeys.every(k => sectionStatuses[k] === 'APPROVED');
        const hasRejections = taskKeys.some(k => sectionStatuses[k] === 'REVISIONS_REQUESTED');
        if (allApproved) {
          return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        }
        if (hasRejections) {
          return { status: 'REVISIONS_REQUESTED', label: 'Revisions', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        }
        return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      // Fallback: check if any task feedback exists in reviewNotes
      if (parsed?.tasks) {
        return { status: 'REVIEWED', label: 'Reviewed', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      }
      if (parsed?.overview || parsed?.overall) {
        return { status: 'REVIEWED', label: 'Reviewed', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      }
      return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }

    if (type === 'MILESTONE') {
      const milestoneKeys = Object.keys(sectionStatuses).filter(k => k.startsWith('milestone-'));
      if (milestoneKeys.length > 0) {
        const allApproved = milestoneKeys.every(k => sectionStatuses[k] === 'APPROVED');
        const hasRejections = milestoneKeys.some(k => sectionStatuses[k] === 'REVISIONS_REQUESTED');
        if (allApproved) {
          return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        }
        if (hasRejections) {
          return { status: 'REVISIONS_REQUESTED', label: 'Revisions', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        }
        return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      if (parsed?.milestones) {
        return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      }
      if (review.reviewedAt) {
        return { status: 'REVIEWED', label: 'Reviewed', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      }
      return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }

    if (type === 'CONCEPT') {
      const conceptKeys = Object.keys(sectionStatuses).filter(k => k.startsWith('concept-'));
      if (conceptKeys.length > 0) {
        const allApproved = conceptKeys.every(k => sectionStatuses[k] === 'APPROVED');
        const hasRejections = conceptKeys.some(k => sectionStatuses[k] === 'REVISIONS_REQUESTED');
        if (allApproved) {
          return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        }
        if (hasRejections) {
          return { status: 'REVISIONS_REQUESTED', label: 'Revisions', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        }
        return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      if (parsed?.concepts) {
        return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      }
      if (review.reviewedAt) {
        return { status: 'REVIEWED', label: 'Reviewed', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      }
      return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }

    if (type === 'ASSET') {
      const approvals = review.reviewLinkAssetApprovals;
      if (approvals.length === 0) {
        return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      const allApproved = approvals.every(a => a.status === 'APPROVED');
      const hasRejections = approvals.some(a => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED');
      if (allApproved) {
        return { status: 'APPROVED', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      }
      if (hasRejections) {
        return { status: 'REVISIONS_REQUESTED', label: 'Revisions', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      }
      return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }

    if (review.reviewedAt) {
      return { status: 'REVIEWED', label: 'Reviewed', color: 'text-purple-400', bg: 'bg-purple-500/10' };
    }
    return { status: 'PENDING', label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/10' };
  };

  // Render all feedback sections - ADDED tasks section
  const renderFeedbackSections = (reviewNotes: string | null) => {
    const parsed = parseReviewNotes(reviewNotes);
    if (!parsed) return null;

    const sections = [];

    if (parsed.overview) {
      sections.push({
        id: 'overview',
        label: 'Project Overview Feedback',
        value: parsed.overview,
        icon: <FolderTree className="w-3.5 h-3.5" />,
        color: 'text-blue-400',
        bg: 'bg-blue-500/5',
        border: 'border-blue-500/10',
      });
    }

    if (parsed.brief) {
      sections.push({
        id: 'brief',
        label: 'Brief Feedback',
        value: parsed.brief,
        icon: <Briefcase className="w-3.5 h-3.5" />,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/5',
        border: 'border-indigo-500/10',
      });
    }

    // ✅ Added Tasks section
    if (parsed.tasks) {
      let taskValue = parsed.tasks;
      if (Array.isArray(parsed.tasks)) {
        taskValue = parsed.tasks.join('\n\n');
      }
      sections.push({
        id: 'tasks',
        label: 'Task Feedback',
        value: taskValue,
        icon: <ListChecks className="w-3.5 h-3.5" />,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/10',
      });
    }

    if (parsed.milestones) {
      let milestoneValue = parsed.milestones;
      if (Array.isArray(parsed.milestones)) {
        milestoneValue = parsed.milestones.join('\n\n');
      }
      sections.push({
        id: 'milestones',
        label: 'Milestone Feedback',
        value: milestoneValue,
        icon: <GitBranch className="w-3.5 h-3.5" />,
        color: 'text-purple-400',
        bg: 'bg-purple-500/5',
        border: 'border-purple-500/10',
      });
    }

    if (parsed.concepts) {
      let conceptValue = parsed.concepts;
      if (Array.isArray(parsed.concepts)) {
        conceptValue = parsed.concepts.join('\n\n');
      }
      sections.push({
        id: 'concepts',
        label: 'Concept Feedback',
        value: conceptValue,
        icon: <Lightbulb className="w-3.5 h-3.5" />,
        color: 'text-amber-400',
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/10',
      });
    }

    if (parsed.overall) {
      sections.push({
        id: 'overall',
        label: 'Overall Project Feedback',
        value: parsed.overall,
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/10',
      });
    }

    if (sections.length === 0) return null;

    return (
      <div className="bg-zinc-900/50 rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Client Feedback</span>
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
            {sections.length} sections
          </Badge>
        </div>
        {sections.map((section, index) => (
          <div 
            key={section.id} 
            className={`border-t border-zinc-700/30 ${index === 0 ? 'border-t-0' : ''} pt-2 ${index === 0 ? 'pt-0' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-xs mb-1">
              <span className={section.color}>{section.icon}</span>
              <span className="text-zinc-400">{section.label}</span>
            </div>
            <div className={`pl-5 border-l-2 ${section.border} ${section.bg} rounded-r-lg p-2`}>
              <p className="text-zinc-200 text-sm whitespace-pre-wrap">
                {section.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReviews = filteredReviews.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterConcept('all');
    setFilterClient('all');
  };

  const getReviewStats = () => {
    const total = reviewLinks.length;
    const active = reviewLinks.filter(r => r.isActive).length;
    const completed = reviewLinks.filter(r => r.reviewedAt !== null).length;
    const pending = reviewLinks.filter(r => r.reviewedAt === null).length;
    
    const withRevisions = reviewLinks.filter(r => 
      r.reviewLinkAssetApprovals.some(a => a.status === 'REVISIONS_REQUESTED' || a.status === 'REJECTED')
    ).length;
    
    const fullyApproved = reviewLinks.filter(r => {
      const approvals = r.reviewLinkAssetApprovals;
      if (approvals.length === 0) return false;
      return approvals.every(a => a.status === 'APPROVED');
    }).length;

    return { total, active, completed, pending, withRevisions, fullyApproved };
  };

  const handleSendForClientReview = async () => {
    if (!conceptId) {
      toast.error('No concept selected. Please select a concept first.');
      return;
    }

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
        toast.error(
          'This concept is not associated with a client. ' +
          'Please ensure the project has a client assigned before creating a review link.'
        );
        setCreatingReviewLink(false);
        return;
      }

      const assetCount = conceptData.assets?.length || 0;
      if (assetCount === 0) {
        toast.error('Please add at least one asset before sending for review.');
        setCreatingReviewLink(false);
        return;
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
      
      const url = data.url;
      const expiresAt = data.expiresAt || null;
      const conceptNameText = data.concept?.name || conceptName || 'Untitled Concept';
      const assetCountText = data.concept?.assetCount || assetCount;
      const clientNameText = conceptData.clientName || conceptData.client?.clientName || 'Client';
      
      setGeneratedLink(url);
      setLinkExpiry(expiresAt);
      setLinkDetails({
        conceptName: conceptNameText,
        assetCount: assetCountText,
        clientName: clientNameText,
      });
      
      setShowReviewLinkModal(true);
      
      try {
        await navigator.clipboard.writeText(url);
        toast.success('✅ Review link copied to clipboard!');
      } catch (clipError) {
        console.warn('Could not copy to clipboard:', clipError);
      }
      
      await fetchReviewLinks();
      
    } catch (error: any) {
      console.error('Error creating review link:', error);
      toast.error(error.message || 'Failed to create review link');
    } finally {
      setCreatingReviewLink(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteReviewLink = async (reviewId: string, token: string) => {
    if (!confirm('⚠️ Are you sure you want to permanently delete this review link?\n\nThis action cannot be undone and will remove all associated approvals and feedback.')) {
      return;
    }

    try {
      const response = await fetch(`/api/client-review/links/${token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete review link');
      }

      toast.success(data.message || '✅ Review link deleted successfully');
      
      setReviewLinks(prev => prev.filter(link => link.id !== reviewId));
      setFilteredReviews(prev => prev.filter(link => link.id !== reviewId));
      
      if (expandedReview === reviewId) {
        setExpandedReview(null);
      }
      
    } catch (error: any) {
      console.error('Error deleting review link:', error);
      toast.error(error.message || '❌ Failed to delete review link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">Client Reviews</h2>
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
            {filteredReviews.length} reviews
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReviewLinks}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {conceptId && (
            <Button
              onClick={handleSendForClientReview}
              disabled={creatingReviewLink}
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
          )}
        </div>
      </div>

      {/* Review Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-100">{getReviewStats().total}</p>
          <p className="text-xs text-zinc-400">Total Reviews</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{getReviewStats().fullyApproved}</p>
          <p className="text-xs text-zinc-400">Approved</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{getReviewStats().withRevisions}</p>
          <p className="text-xs text-zinc-400">Revisions Needed</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{getReviewStats().pending}</p>
          <p className="text-xs text-zinc-400">Pending</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{getReviewStats().completed}</p>
          <p className="text-xs text-zinc-400">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 space-y-3">
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="approved">All Approved</option>
            <option value="revisions">Revisions Needed</option>
          </select>

          {uniqueConcepts.length > 1 && (
            <select
              value={filterConcept}
              onChange={(e) => setFilterConcept(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Concepts</option>
              {uniqueConcepts.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          {uniqueClients.length > 1 && (
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          {(searchQuery || filterStatus !== 'all' || filterConcept !== 'all' || filterClient !== 'all') && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-200"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {(searchQuery || filterStatus !== 'all' || filterConcept !== 'all' || filterClient !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700/30">
            <span className="text-xs text-zinc-500">Active filters:</span>
            {searchQuery && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                Search: {searchQuery}
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">
                Status: {filterStatus}
              </Badge>
            )}
            {filterConcept !== 'all' && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                Concept: {filterConcept}
              </Badge>
            )}
            {filterClient !== 'all' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                Client: {filterClient}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">
            {reviewLinks.length === 0 ? 'No review links yet' : 'No reviews match your filters'}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            {reviewLinks.length === 0 
              ? 'Generate a review link from a concept to get client feedback'
              : 'Try adjusting your filters to see more results'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentReviews.map((review) => {
              const isExpanded = expandedReview === review.id;
              const totalAssets = review.reviewLinkAssetApprovals.length;
              const approvedCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'APPROVED').length;
              const rejectedCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'REJECTED' || a.status === 'REVISIONS_REQUESTED').length;
              const pendingCount = review.reviewLinkAssetApprovals.filter(a => a.status === 'PENDING').length;
              
              const hasBrief = review.hasBrief;
              const briefStatus = review.briefApprovalStatus || 'PENDING';
              const briefStatusInfo = statusConfig[briefStatus as keyof typeof statusConfig] || statusConfig.PENDING;
              
              const isComplete = pendingCount === 0 && (!hasBrief || briefStatus === 'APPROVED' || briefStatus === 'REVIEWED');

              // Get statuses for each section - NOW INCLUDES TASKS
              const projectStatus = getItemStatus(review, 'PROJECT');
              const briefStatusInfo2 = getItemStatus(review, 'BRIEF');
              const taskStatus = getItemStatus(review, 'TASK');
              const milestoneStatus = getItemStatus(review, 'MILESTONE');
              const conceptStatus = getItemStatus(review, 'CONCEPT');

              return (
                <div
                  key={review.id}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden"
                >
                  {/* Review Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                    onClick={() => toggleExpand(review.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-zinc-100">
                            {review.concept.name}
                          </h3>
                          <Badge className={review.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}>
                            {review.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {review.client.clientName}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {review.concept.project.projectName}
                          </span>
                          {review.reviewedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Reviewed {format(new Date(review.reviewedAt), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {review.viewCount} views
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {approvedCount > 0 && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                {approvedCount} ✓
                              </Badge>
                            )}
                            {rejectedCount > 0 && (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                                {rejectedCount} ✗
                              </Badge>
                            )}
                            {pendingCount > 0 && (
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                                {pendingCount} pending
                              </Badge>
                            )}
                          </div>
                        </div>
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
                      {/* Status Cards - Show ALL section statuses including TASKS */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Project</p>
                          <p className={`font-medium ${projectStatus.color}`}>
                            {projectStatus.label}
                          </p>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Brief</p>
                          <p className={`font-medium ${briefStatusInfo2.color}`}>
                            {briefStatusInfo2.label}
                          </p>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Tasks</p>
                          <p className={`font-medium ${taskStatus.color}`}>
                            {taskStatus.label}
                          </p>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Milestones</p>
                          <p className={`font-medium ${milestoneStatus.color}`}>
                            {milestoneStatus.label}
                          </p>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Concepts</p>
                          <p className={`font-medium ${conceptStatus.color}`}>
                            {conceptStatus.label}
                          </p>
                        </div>
                      </div>

                      {/* Status Cards - Additional info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-zinc-900/50 rounded-lg p-3">
                          <p className="text-zinc-400 text-xs">Overall Status</p>
                          <p className="text-zinc-200 font-medium">
                            {isComplete ? (rejectedCount > 0 ? 'Revisions Needed' : 'Fully Approved') : 'In Progress'}
                          </p>
                        </div>
                        {review.reviewedAt && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-zinc-400 text-xs">Reviewed By</p>
                            <p className="text-zinc-200 font-medium">
                              {review.reviewedBy || review.reviewerEmail || 'Anonymous'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Brief Status Section */}
                      {hasBrief && (
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-zinc-400 text-xs">Project Brief</p>
                              <p className="text-zinc-200 font-medium text-sm">
                                {review.concept.project.brief?.title || 'Untitled Brief'}
                              </p>
                            </div>
                            <Badge className={`${briefStatusInfo.bg} ${briefStatusInfo.color} border ${briefStatusInfo.border}`}>
                              <span className="flex items-center gap-1 text-xs">
                                {briefStatusInfo.icon}
                                {briefStatusInfo.label}
                              </span>
                            </Badge>
                          </div>
                          {(() => {
                            const parsed = parseReviewNotes(review.reviewNotes);
                            if (parsed?.brief) {
                              return (
                                <div className="mt-2 bg-zinc-800/50 p-2 rounded">
                                  <p className="text-xs text-zinc-400">Brief Feedback</p>
                                  <p className="text-sm text-zinc-300">{parsed.brief}</p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Render all feedback sections - NOW INCLUDES TASKS */}
                      {renderFeedbackSections(review.reviewNotes)}

                      {/* Asset Reviews - UPDATED with production metadata */}
                      <div>
                        <h4 className="text-sm font-medium text-zinc-200 mb-2">Asset Reviews</h4>
                        <div className="space-y-2">
                          {review.reviewLinkAssetApprovals.map((approval) => {
                            const statusInfo = statusConfig[approval.status as keyof typeof statusConfig] || statusConfig.PENDING;
                            const asset = approval.creativeAsset;
                            const version = approval.creativeAssetVersion;

                            return (
                              <div
                                key={approval.id}
                                className={`bg-zinc-900/30 border rounded-lg p-3 ${statusInfo.border}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-zinc-200 text-sm">
                                        {asset.name}
                                      </span>
                                      <Badge className={`${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                                        <span className="flex items-center gap-1 text-[10px]">
                                          {statusInfo.icon}
                                          {statusInfo.label}
                                        </span>
                                      </Badge>
                                      {/* ✅ Production stage badge */}
                                      {asset.productionStage && (
                                        <ProductionStageBadge stage={asset.productionStage} />
                                      )}
                                      {/* ✅ Asset type badge for production assets */}
                                      {['RAW_FOOTAGE', 'EXPORT_MASTER', 'EXPORT_HIGH_RES', 'EXPORT_WEB', 'MOTION_GRAPHICS', 'VFX', 'COLOR_GRADE'].includes(asset.type) && (
                                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">
                                          Production
                                        </Badge>
                                      )}
                                    </div>
                                    {version && (
                                      <p className="text-xs text-zinc-400 mt-0.5">
                                        v{version.versionNo} • {format(new Date(version.createdAt), 'MMM d, yyyy')}
                                        {version.fileSize && (
                                          <span className="ml-2">
                                            • {formatFileSize(version.fileSize)}
                                          </span>
                                        )}
                                        {version.resolution && (
                                          <span className="ml-2">
                                            • {version.resolution}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {approval.feedback && (
                                      <div className="mt-1 bg-zinc-800/50 p-2 rounded">
                                        <p className="text-xs text-zinc-400">Feedback</p>
                                        <p className="text-sm text-zinc-300">{approval.feedback}</p>
                                      </div>
                                    )}
                                    {approval.generalFeedback && (
                                      <div className="mt-1 bg-zinc-800/50 p-2 rounded">
                                        <p className="text-xs text-zinc-400">General Feedback</p>
                                        <p className="text-sm text-zinc-300">{approval.generalFeedback}</p>
                                      </div>
                                    )}
                                    {/* ✅ Production metadata display */}
                                    <ProductionMetadataDisplay metadata={asset.productionMetadata} />
                                  </div>
                                  {approval.approvedAt && (
                                    <div className="text-xs text-zinc-500 shrink-0">
                                      {format(new Date(approval.approvedAt), 'MMM d, h:mm a')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700/50">
                        <Button
                          onClick={() => handleCopyLink(review.token)}
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy Link
                        </Button>
                        <a
                          href={`/client-review/${review.token}`}
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
                          onClick={() => handleDeleteReviewLink(review.id, review.token)}
                          variant="outline"
                          size="sm"
                          className="border-red-700/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-600"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-700/50">
              <div className="text-sm text-zinc-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredReviews.length)} of {filteredReviews.length} reviews
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm text-zinc-300">{currentPage}</span>
                  <span className="text-sm text-zinc-500">/</span>
                  <span className="text-sm text-zinc-500">{totalPages}</span>
                </div>
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Link Modal */}
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
                <p className="text-xs text-zinc-400 mb-1">Client</p>
                <p className="text-sm text-zinc-200 font-medium">{linkDetails?.clientName}</p>
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