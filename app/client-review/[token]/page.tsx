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
  Edit,
  Star,
  Flag,
  FolderTree,
  ListChecks,
  GitBranch,
  Lightbulb,
  Briefcase,
  Calendar,
  DollarSign,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================
// TYPES
// ============================================

interface AssetVersion {
  id: string;
  versionNo: number;
  fileUrl: string;
  status: string;
  feedback: string | null;
  createdAt: string;
}

interface BriefData {
  id: string;
  title: string;
  status: string;
  objectives: string;
  audience: string | null;
  keyMessage: string | null;
  deliverables: string[];
  references: string[];
  budget: number | null;
}

interface CreativeAsset {
  id: string;
  name: string;
  type: string;
  description: string | null;
  latestVersion: AssetVersion | null;
  versions: AssetVersion[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  generalFeedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
}

interface TaskData {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  taskType: string;
  dueDate: string | null;
  concepts: ConceptData[];
  assets: CreativeAsset[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
}

interface MilestoneData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  budget: number | null;
  currency: string;
  order: number;
  tasks: TaskData[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
}

interface ConceptData {
  id: string;
  name: string;
  description: string | null;
  brief: string | null;
  status: string;
  assets: CreativeAsset[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
}

interface ProjectData {
  id: string;
  name: string;
  projectName: string;
  description: string | null;
  status: string;
  targetDeadline: string | null;
  totalValue: number;
  currency: string;
  clientName: string;
  agencyName: string;
  milestones: MilestoneData[];
  tasks: TaskData[];
  brief: BriefData | null;
  concepts: ConceptData[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  feedback: string | null;
  approvedAt: string | null;
  revisionTaskId: string | null;
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
  reviewedBy: string | null;
  reviewerEmail: string | null;
  reviewScope: 'PROJECT' | 'MILESTONE' | 'TASK' | 'CONCEPT';
}

// ============================================
// COMPONENT
// ============================================

export default function ClientReviewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [linkData, setLinkData] = useState<ReviewLinkData | null>(null);
  const [reviewScope, setReviewScope] = useState<'PROJECT' | 'MILESTONE' | 'TASK' | 'CONCEPT'>('PROJECT');

  // Approvals and feedback
  const [approvals, setApprovals] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState<Record<string, string>>({});
  
  // Level-specific feedback
 const [projectFeedback, setProjectFeedback] = useState({
  overview: '',
  brief: '',
  overall: '',
  milestones: '',
  concepts: '',
});
  // Reviewer info
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState({
    projectOverview: true,
    brief: false, // ✅ Add brief
    milestones: true,
    tasks: true,
    concepts: true,
    assets: true,
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ============================================
  // FETCH DATA
  // ============================================

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
    setProject(data.project);
    setLinkData(data.link);
    setReviewScope(data.link.reviewScope || 'PROJECT');

    // Initialize approvals and feedback
    const initialApprovals: Record<string, string> = {};
    const initialFeedback: Record<string, string> = {};
    const initialGeneralFeedback: Record<string, string> = {};

    // ✅ Process all items including assets with their feedback
    const allItems = [
      // Milestones
      ...(data.project.milestones || []),
      // Tasks
      ...(data.project.tasks || []),
      // Concepts
      ...(data.project.concepts || []),
      // Tasks inside milestones
      ...(data.project.milestones?.flatMap((m: MilestoneData) => m.tasks || []) || []),
      // Concepts inside tasks (from milestones)
      ...(data.project.milestones?.flatMap((m: MilestoneData) => m.tasks?.flatMap((t: TaskData) => t.concepts || []) || []) || []),
      // ✅ Assets inside concepts (from milestones)
      ...(data.project.milestones?.flatMap((m: MilestoneData) => m.tasks?.flatMap((t: TaskData) => t.concepts?.flatMap((c: ConceptData) => c.assets || []) || []) || []) || []),
      // ✅ Assets inside direct concepts
      ...(data.project.concepts?.flatMap((c: ConceptData) => c.assets || []) || []),
    ];

    // ✅ Add brief if it exists
    if (data.project.brief) {
      allItems.push({
        id: `brief-${data.project.brief.id}`,
        type: 'BRIEF',
        approvalStatus: data.project.brief.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
        feedback: null,
        generalFeedback: null,
      });
    }

    // ✅ Process all items and initialize feedback
    allItems.forEach((item: any) => {
      if (item.id) {
        // For assets, use the actual feedback from the asset
        if (item.feedback !== undefined) {
          initialFeedback[item.id] = item.feedback || '';
        }
        if (item.generalFeedback !== undefined) {
          initialGeneralFeedback[item.id] = item.generalFeedback || '';
        }
        initialApprovals[item.id] = item.approvalStatus || 'PENDING';
      }
    });

    // ✅ Also process assets directly from the project structure
    // This ensures all assets are captured
    const processAssetFeedback = (assets: any[]) => {
      assets?.forEach((asset: any) => {
        if (asset.id) {
          initialApprovals[asset.id] = asset.approvalStatus || 'PENDING';
          initialFeedback[asset.id] = asset.feedback || '';
          initialGeneralFeedback[asset.id] = asset.generalFeedback || '';
        }
      });
    };

    // Process assets in direct concepts
    data.project.concepts?.forEach((concept: ConceptData) => {
      processAssetFeedback(concept.assets);
    });

    // Process assets in milestone tasks
    data.project.milestones?.forEach((milestone: MilestoneData) => {
      milestone.tasks?.forEach((task: TaskData) => {
        task.concepts?.forEach((concept: ConceptData) => {
          processAssetFeedback(concept.assets);
        });
      });
    });

    // Process direct tasks
    data.project.tasks?.forEach((task: TaskData) => {
      task.concepts?.forEach((concept: ConceptData) => {
        processAssetFeedback(concept.assets);
      });
    });

    setApprovals(initialApprovals);
    setFeedback(initialFeedback);
    setGeneralFeedback(initialGeneralFeedback);

    if (data.link.reviewedAt) {
      setSubmitted(true);
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // HANDLERS
  // ============================================

  const handleApprovalChange = (id: string, status: string) => {
    setApprovals((prev) => ({ ...prev, [id]: status }));
  };

  const handleFeedbackChange = (id: string, feedbackText: string) => {
    setFeedback((prev) => ({ ...prev, [id]: feedbackText }));
  };

  const handleGeneralFeedbackChange = (id: string, feedbackText: string) => {
    setGeneralFeedback((prev) => ({ ...prev, [id]: feedbackText }));
  };

  const handleProjectFeedbackChange = (section: keyof typeof projectFeedback, value: string) => {
    setProjectFeedback((prev) => ({ ...prev, [section]: value }));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ============================================
  // VALIDATION & SUBMISSION
  // ============================================

  const getAllReviewableItems = (): { id: string; type: string }[] => {
    const items: { id: string; type: string }[] = [];

    if (project) {
      // Project level
      items.push({ id: project.id, type: 'PROJECT' });

      // Brief
      if (project.brief) {
        items.push({ id: `brief-${project.brief.id}`, type: 'BRIEF' });
      }

      // Milestones
      project.milestones?.forEach((m) => {
        items.push({ id: m.id, type: 'MILESTONE' });
        m.tasks?.forEach((t) => {
          items.push({ id: t.id, type: 'TASK' });
          t.concepts?.forEach((c) => {
            items.push({ id: c.id, type: 'CONCEPT' });
            c.assets?.forEach((a) => {
              items.push({ id: a.id, type: 'ASSET' });
            });
          });
        });
      });

      // Direct concepts
      project.concepts?.forEach((c) => {
        items.push({ id: c.id, type: 'CONCEPT' });
        c.assets?.forEach((a) => {
          items.push({ id: a.id, type: 'ASSET' });
        });
      });

      // Direct tasks
      project.tasks?.forEach((t) => {
        items.push({ id: t.id, type: 'TASK' });
        t.concepts?.forEach((c) => {
          items.push({ id: c.id, type: 'CONCEPT' });
          c.assets?.forEach((a) => {
            items.push({ id: a.id, type: 'ASSET' });
          });
        });
      });
    }

    return items;
  };

  const validateSubmission = () => {
    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    const items = getAllReviewableItems();
    const pendingItems = items.filter((item) => approvals[item.id] === 'PENDING');

    if (pendingItems.length > 0) {
      toast.error(`Please review all items (${pendingItems.length} pending)`);
      return false;
    }

    // Check if any rejected item lacks feedback
    const rejectedWithoutFeedback = items.filter(
      (item) => 
        (approvals[item.id] === 'REJECTED' || approvals[item.id] === 'REVISIONS_REQUESTED') &&
        !feedback[item.id]?.trim()
    );

    if (rejectedWithoutFeedback.length > 0) {
      toast.error('Please provide feedback for all rejected items');
      return false;
    }

    return true;
  };

  const handleSubmitReview = async () => {
    if (!validateSubmission()) return;
    setShowSubmitConfirm(true);
  };

  // Roll up individual milestone/concept feedback into readable text blocks.
// There's no per-milestone/per-concept approval table — only the aggregate
// reviewNotes JSON on ReviewLink — so this is where that feedback has to land.
const buildRollupFeedback = () => {
  const briefText = project?.brief ? feedback[`brief-${project.brief.id}`]?.trim() : undefined;

  const milestoneLines: string[] = [];
  project?.milestones?.forEach((m) => {
    const text = feedback[m.id]?.trim();
    if (text) milestoneLines.push(`${m.name}: ${text}`);
  });

  const conceptLines: string[] = [];
  const collectConceptFeedback = (concepts?: ConceptData[]) => {
    concepts?.forEach((c) => {
      const text = feedback[c.id]?.trim();
      if (text) conceptLines.push(`${c.name}: ${text}`);
    });
  };
  collectConceptFeedback(project?.concepts);
  project?.tasks?.forEach((t) => collectConceptFeedback(t.concepts));
  project?.milestones?.forEach((m) =>
    m.tasks?.forEach((t) => collectConceptFeedback(t.concepts))
  );

  return {
    brief: briefText || null,
    milestones: milestoneLines.join('\n\n') || null,
    concepts: conceptLines.join('\n\n') || null,
  };
};

  // Update the submit handler
const confirmSubmit = async () => {
  setSubmitting(true);
  setShowSubmitConfirm(false);

  try {
    const items = getAllReviewableItems();
    const approvalsArray = items.map((item) => ({
      id: item.id,
      type: item.type,
      status: approvals[item.id] || 'PENDING',
      feedback: feedback[item.id] || null,
      generalFeedback: generalFeedback[item.id] || null,
    }));

    // Merge per-milestone/per-concept notes into the aggregate feedback
    // object, since that's the only place they can actually be saved.
    const rollup = buildRollupFeedback();
    const finalProjectFeedback = {
      ...projectFeedback,
      brief: projectFeedback.brief?.trim() || rollup.brief,
      milestones: projectFeedback.milestones?.trim() || rollup.milestones,
      concepts: projectFeedback.concepts?.trim() || rollup.concepts,
    };

    const response = await fetch(`/api/client-review/links/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvals: approvalsArray,
        projectFeedback: finalProjectFeedback,
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

  // ============================================
  // STATUS HELPERS
  // ============================================

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
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
    return configs[status] || configs.PENDING;
  };

  const getAssetTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
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
    return icons[type] || <File className="w-5 h-5" />;
  };

  // ============================================
  // COUNT HELPERS
  // ============================================

  const getPendingCount = () => {
    const items = getAllReviewableItems();
    return items.filter((item) => approvals[item.id] === 'PENDING').length;
  };

  const getApprovedCount = () => {
    const items = getAllReviewableItems();
    return items.filter((item) => approvals[item.id] === 'APPROVED').length;
  };

  const getRejectedCount = () => {
    const items = getAllReviewableItems();
    return items.filter(
      (item) => approvals[item.id] === 'REJECTED' || approvals[item.id] === 'REVISIONS_REQUESTED'
    ).length;
  };

  const getTotalItems = () => {
    return getAllReviewableItems().length;
  };

  // ============================================
  // RENDER
  // ============================================

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

  if (!project || !linkData) {
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

  const totalItems = getTotalItems();
  const pendingCount = getPendingCount();
  const approvedCount = getApprovedCount();
  const rejectedCount = getRejectedCount();
  const progress = totalItems > 0 ? ((totalItems - pendingCount) / totalItems) * 100 : 0;
  const allApproved = pendingCount === 0 && rejectedCount === 0;
  const hasRejections = rejectedCount > 0;
  const hasPending = pendingCount > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700/50 py-4 px-6 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-blue-400" />
              Review: {project.projectName || project.name}
            </h1>
            <p className="text-sm text-slate-400">
              <Building className="w-3 h-3 inline mr-1" />
              {project.agencyName} • <User className="w-3 h-3 inline mr-1" />
              {project.clientName}
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
                  <span>Expires: {format(new Date(linkData.expiresAt), 'PPP')}</span>
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
            </p>
            {projectFeedback.overall && (
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-300">"{projectFeedback.overall}"</p>
              </div>
            )}
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm">
                  {approvedCount} Approved
                </span>
                {hasRejections && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm">
                    {rejectedCount} Revisions Requested
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
            {/* Review Instructions & Progress */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Review Instructions
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Review the project and all its components:
                  </p>
                  <ul className="text-xs text-slate-400 mt-2 list-disc list-inside space-y-0.5">
                    <li>Project overview and brief</li>
                    <li>Milestones and their tasks</li>
                    <li>Concepts and creative assets</li>
                  </ul>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">
                    Progress: {totalItems - pendingCount}/{totalItems} items reviewed
                  </span>
                  <span className="text-slate-500">
                    {hasPending ? `⚠️ ${pendingCount} pending` : '✅ All items reviewed'}
                  </span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-700/50" />
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-emerald-400">✓ {approvedCount} Approved</span>
                  <span className="text-amber-400">✗ {rejectedCount} Revisions</span>
                  <span className="text-blue-400">⏳ {pendingCount} Pending</span>
                </div>
              </div>
            </div>

            {/* ============================================
                PROJECT LEVEL
                ============================================ */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
              <button
                onClick={() => toggleSection('projectOverview')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Project Overview</h2>
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                    Required
                  </Badge>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.projectOverview ? 'rotate-180' : ''}`} />
              </button>

              {expandedSections.projectOverview && (
                <div className="border-t border-slate-700/50 p-4 space-y-4">
                  {/* Project Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="text-slate-200 font-medium">{project.status}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Budget</p>
                      <p className="text-slate-200 font-medium">
                        {project.currency} {project.totalValue?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Deadline</p>
                      <p className="text-slate-200 font-medium">
                        {project.targetDeadline ? format(new Date(project.targetDeadline), 'PPP') : 'Not set'}
                      </p>
                    </div>
                  </div>

                  {/* Project Feedback */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Project Overview Feedback
                      <span className="text-slate-500 text-[10px] ml-2">(Optional)</span>
                    </label>
                    <textarea
                      value={projectFeedback.overview}
                      onChange={(e) => handleProjectFeedbackChange('overview', e.target.value)}
                      placeholder="What do you think about the overall project direction?"
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Overall Project Feedback
                      <span className="text-red-400 text-[10px] ml-2">* Recommended</span>
                    </label>
                    <textarea
                      value={projectFeedback.overall}
                      onChange={(e) => handleProjectFeedbackChange('overall', e.target.value)}
                      placeholder="Overall thoughts on the project, strategy, and execution..."
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>

              {/* ============================================
                  BRIEF SECTION
                  ============================================ */}
              {project.brief && (() => {
                const brief = project.brief; // narrowed to BriefData, stable const
                return (
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                    <button
                      onClick={() => toggleSection('brief')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-sm font-semibold text-slate-200">Project Brief</h2>
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px]">
                          Review Required
                        </Badge>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.brief ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedSections.brief && (
                      <div className="border-t border-slate-700/50 p-4 space-y-4">
                        {/* Brief Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-xs text-slate-400">Brief Title</p>
                            <p className="text-slate-200 font-medium">{brief.title}</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-xs text-slate-400">Status</p>
                            <p className="text-slate-200 font-medium">{brief.status}</p>
                          </div>
                          {brief.budget && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Budget</p>
                              <p className="text-slate-200 font-medium">
                                {project.currency} {brief.budget.toLocaleString()}
                              </p>
                            </div>
                          )}
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-xs text-slate-400">Deliverables</p>
                            <p className="text-slate-200 font-medium">
                              {brief.deliverables?.length || 0} items
                            </p>
                          </div>
                        </div>

                        {/* Objectives */}
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Objectives</p>
                          <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap">
                            {brief.objectives || 'No objectives specified'}
                          </div>
                        </div>

                        {/* Audience */}
                        {brief.audience && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Target Audience</p>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-200">
                              {brief.audience}
                            </div>
                          </div>
                        )}

                        {/* Key Message */}
                        {brief.keyMessage && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Key Message</p>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-200">
                              {brief.keyMessage}
                            </div>
                          </div>
                        )}

                        {/* Deliverables */}
                        {brief.deliverables && brief.deliverables.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Deliverables</p>
                            <div className="flex flex-wrap gap-2">
                              {brief.deliverables.map((deliverable, index) => (
                                <Badge key={index} className="bg-slate-800 text-slate-300 border-slate-700">
                                  {deliverable}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* References */}
                        {brief.references && brief.references.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">References</p>
                            <div className="flex flex-wrap gap-2">
                              {brief.references.map((reference, index) => (
                                <Badge key={index} className="bg-slate-800 text-blue-400 border-blue-800">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {reference}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Brief Feedback */}
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">
                            Brief Feedback
                            <span className="text-slate-500 text-[10px] ml-2">(Optional)</span>
                          </label>
                          <textarea
                            value={feedback[`brief-${brief.id}`] || ''}
                            onChange={(e) => handleFeedbackChange(`brief-${brief.id}`, e.target.value)}
                            placeholder="Provide feedback on the project brief..."
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                            rows={3}
                          />
                        </div>

                        {/* Approval Controls */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleApprovalChange(`brief-${brief.id}`, 'APPROVED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              approvals[`brief-${brief.id}`] === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve Brief
                          </button>
                          <button
                            onClick={() => handleApprovalChange(`brief-${brief.id}`, 'REJECTED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              approvals[`brief-${brief.id}`] === 'REJECTED' || 
                              approvals[`brief-${brief.id}`] === 'REVISIONS_REQUESTED'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Request Revisions
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            {/* ============================================
                MILESTONES
                ============================================ */}
            {project.milestones && project.milestones.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => toggleSection('milestones')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Milestones</h2>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                      {project.milestones.length} milestones
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.milestones ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.milestones && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4">
                    {project.milestones.map((milestone) => {
                      const statusInfo = getStatusConfig(approvals[milestone.id] || 'PENDING');
                      const isExpanded = expandedItems.has(milestone.id);

                      return (
                        <div
                          key={milestone.id}
                          className={`bg-slate-900/30 border rounded-xl overflow-hidden ${statusInfo.border}`}
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/20 transition-colors"
                            onClick={() => toggleExpand(milestone.id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-1.5 bg-slate-700/50 rounded-lg shrink-0">
                                <GitBranch className="w-4 h-4 text-purple-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-100 text-sm truncate">
                                  {milestone.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span>{milestone.status}</span>
                                  {milestone.deadline && (
                                    <>
                                      <span>•</span>
                                      <span>Due: {format(new Date(milestone.deadline), 'MMM d, yyyy')}</span>
                                    </>
                                  )}
                                  {milestone.budget && (
                                    <>
                                      <span>•</span>
                                      <span>{milestone.currency} {milestone.budget}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
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

                          {isExpanded && (
                            <div className="border-t border-slate-700/50 p-3 space-y-3">
                              {/* Milestone Feedback */}
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">
                                  Milestone Feedback
                                  <span className="text-slate-500 text-[10px] ml-2">(Optional)</span>
                                </label>
                                <textarea
                                  value={feedback[milestone.id] || ''}
                                  onChange={(e) => handleFeedbackChange(milestone.id, e.target.value)}
                                  placeholder="Provide feedback on this milestone..."
                                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[60px]"
                                  rows={2}
                                />
                              </div>

                              {/* Approval Controls */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleApprovalChange(milestone.id, 'APPROVED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    approvals[milestone.id] === 'APPROVED'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApprovalChange(milestone.id, 'REJECTED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    approvals[milestone.id] === 'REJECTED' || approvals[milestone.id] === 'REVISIONS_REQUESTED'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                  }`}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Request Revisions
                                </button>
                              </div>

                              {/* Tasks in this milestone */}
                              {milestone.tasks && milestone.tasks.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700/30">
                                  <p className="text-xs text-slate-400 mb-2">Tasks in this milestone:</p>
                                  <div className="space-y-2">
                                    {milestone.tasks.map((task) => (
                                      <div key={task.id} className="bg-slate-900/30 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs text-slate-200 font-medium">{task.title || task.taskType}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                              <span>{task.status}</span>
                                              <span>•</span>
                                              <span>{task.priority}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <select
                                              value={approvals[task.id] || 'PENDING'}
                                              onChange={(e) => handleApprovalChange(task.id, e.target.value)}
                                              className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-200"
                                            >
                                              <option value="PENDING">Pending</option>
                                              <option value="APPROVED">Approve</option>
                                              <option value="REJECTED">Revisions</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================
                CONCEPTS
                ============================================ */}
            {project.concepts && project.concepts.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => toggleSection('concepts')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Concepts</h2>
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                      {project.concepts.length} concepts
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.concepts ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.concepts && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4">
                    {project.concepts.map((concept) => {
                      const statusInfo = getStatusConfig(approvals[concept.id] || 'PENDING');
                      const isExpanded = expandedItems.has(concept.id);

                      return (
                        <div
                          key={concept.id}
                          className={`bg-slate-900/30 border rounded-xl overflow-hidden ${statusInfo.border}`}
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/20 transition-colors"
                            onClick={() => toggleExpand(concept.id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-1.5 bg-slate-700/50 rounded-lg shrink-0">
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-100 text-sm truncate">
                                  {concept.name}
                                </h4>
                                <p className="text-xs text-slate-400 truncate">
                                  {concept.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
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

                          {isExpanded && (
                            <div className="border-t border-slate-700/50 p-3 space-y-3">
                              {/* Concept Feedback */}
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">
                                  Concept Feedback
                                  <span className="text-slate-500 text-[10px] ml-2">(Optional)</span>
                                </label>
                                <textarea
                                  value={feedback[concept.id] || ''}
                                  onChange={(e) => handleFeedbackChange(concept.id, e.target.value)}
                                  placeholder="Provide feedback on this concept..."
                                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[60px]"
                                  rows={2}
                                />
                              </div>

                              {/* Approval Controls */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleApprovalChange(concept.id, 'APPROVED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    approvals[concept.id] === 'APPROVED'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApprovalChange(concept.id, 'REJECTED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    approvals[concept.id] === 'REJECTED' || approvals[concept.id] === 'REVISIONS_REQUESTED'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                  }`}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Request Revisions
                                </button>
                              </div>

                              {/* Assets in this concept */}
                              {concept.assets && concept.assets.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700/30">
                                  <p className="text-xs text-slate-400 mb-2">Assets in this concept:</p>
                                  <div className="space-y-2">
                                    {concept.assets.map((asset) => (
                                      <div key={asset.id} className="bg-slate-900/30 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {getAssetTypeIcon(asset.type)}
                                            <div>
                                              <p className="text-xs text-slate-200 font-medium">{asset.name}</p>
                                              <p className="text-[10px] text-slate-400">{asset.type}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <select
                                              value={approvals[asset.id] || 'PENDING'}
                                              onChange={(e) => handleApprovalChange(asset.id, e.target.value)}
                                              className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-200"
                                            >
                                              <option value="PENDING">Pending</option>
                                              <option value="APPROVED">Approve</option>
                                              <option value="REJECTED">Revisions</option>
                                            </select>
                                          </div>
                                        </div>
                                        {asset.latestVersion?.fileUrl && (
                                          <a
                                            href={asset.latestVersion.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                                          >
                                            <Download className="w-3 h-3" />
                                            Download v{asset.latestVersion.versionNo}
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}


            {/* ============================================
                REVIEWER INFO & SUBMIT
                ============================================ */}
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
                    Please review all items first
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
                  ⚠️ {pendingCount} item(s) still pending review
                </p>
              )}
              {!projectFeedback.overall.trim() && !hasPending && (
                <p className="text-xs text-amber-400/70 mt-2 text-center">
                  💡 Consider adding overall project feedback before submitting
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Confirm Submission
            </h3>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <p>You're about to submit your review with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>{approvedCount} approved items</li>
                {hasRejections && (
                  <li className="text-amber-400">
                    {rejectedCount} items with revision requests
                  </li>
                )}
                {projectFeedback.overall && (
                  <li className="text-blue-400">✓ Overall project feedback provided</li>
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
