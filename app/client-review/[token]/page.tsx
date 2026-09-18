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
  deletedAt?: string | null;
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
  deletedAt?: string | null;
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
  deletedAt?: string | null;
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
  deletedAt?: string | null;
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
  deletedAt?: string | null;
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

// API response types (with deletedAt for filtering)
interface ApiMilestone extends MilestoneData {
  deletedAt?: string | null;
}

interface ApiTask extends TaskData {
  deletedAt?: string | null;
}

interface ApiConcept extends ConceptData {
  deletedAt?: string | null;
}

interface ApiAsset extends CreativeAsset {
  deletedAt?: string | null;
}

// ============================================
// UTILITIES
// ============================================

// ✅ SAFE DATE FORMATTER: Prevents "Invalid time value" error
const safeFormatDate = (date: string | null | undefined, formatStr: string = 'PPP'): string => {
  if (!date) return 'Not set';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return 'Invalid Date';
  return format(parsed, formatStr);
};

// Helper to filter out deleted items
const filterActive = <T extends { deletedAt?: string | null }>(items: T[] | undefined | null): T[] => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => item.deletedAt === null || item.deletedAt === undefined);
};

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
    tasks: '',
  });
  
  // Reviewer info
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState({
    projectOverview: true,
    brief: false,
    milestones: true,
    tasks: true,
    concepts: true,
    assets: true,
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<string, string>>({
    project: 'PENDING',
    brief: 'PENDING',
  });

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
      
      // ✅ Deep filter: recursively filter out deleted items in milestones/tasks/concepts
      const filterItemsDeep = <T extends { deletedAt?: string | null; tasks?: any[]; concepts?: any[]; assets?: any[] }>(items: T[]): any[] => {
        return filterActive(items).map(item => ({
          ...item,
          tasks: item.tasks ? filterItemsDeep(item.tasks) : undefined,
          concepts: item.concepts ? filterItemsDeep(item.concepts) : undefined,
          assets: item.assets ? filterActive(item.assets) : undefined,
        }));
      };

      const filteredProject: ProjectData = {
        ...data.project,
        milestones: filterItemsDeep(data.project.milestones || []),
        tasks: filterItemsDeep(data.project.tasks || []),
        concepts: filterItemsDeep(data.project.concepts || []),
      };
      
      setProject(filteredProject);
      setLinkData(data.link);
      setReviewScope(data.link.reviewScope || 'PROJECT');

      // Initialize approvals and feedback
      const initialApprovals: Record<string, string> = {};
      const initialFeedback: Record<string, string> = {};
      const initialGeneralFeedback: Record<string, string> = {};

      // Add project to approvals with APPROVED status
      initialApprovals[data.project.id] = 'APPROVED';

      // Collect all items for initialization
      const allItems: any[] = [];

      // Add project
      allItems.push({
        id: data.project.id,
        type: 'PROJECT',
        approvalStatus: 'APPROVED',
        feedback: null,
        generalFeedback: null,
      });

      // Add brief if exists
      if (data.project.brief) {
        allItems.push({
          id: `brief-${data.project.brief.id}`,
          type: 'BRIEF',
          approvalStatus: data.project.brief.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
          feedback: null,
          generalFeedback: null,
        });
      }

      // Helper to recursively collect items - using any for API data
      const collectItems = (items: any[]) => {
        if (!items) return;
        items.forEach((item: any) => {
          if (item && item.id) {
            allItems.push({
              id: item.id,
              type: item.type || 'UNKNOWN',
              approvalStatus: item.approvalStatus || 'PENDING',
              feedback: item.feedback || null,
              generalFeedback: item.generalFeedback || null,
            });
          }
        });
      };

      // Add milestones (filtered)
      const activeMilestones = filteredProject.milestones || [];
      activeMilestones.forEach((m: any) => {
        allItems.push({
          id: m.id,
          type: 'MILESTONE',
          approvalStatus: m.approvalStatus || 'PENDING',
          feedback: m.feedback || null,
          generalFeedback: m.generalFeedback || null,
        });
        
        // Add tasks inside milestones (filtered)
        const activeTasks = m.tasks || [];
        activeTasks.forEach((t: any) => {
          allItems.push({
            id: t.id,
            type: 'TASK',
            approvalStatus: t.approvalStatus || 'PENDING',
            feedback: t.feedback || null,
            generalFeedback: t.generalFeedback || null,
          });
          
          // Add concepts inside tasks (filtered)
          const activeConcepts = t.concepts || [];
          activeConcepts.forEach((c: any) => {
            allItems.push({
              id: c.id,
              type: 'CONCEPT',
              approvalStatus: c.approvalStatus || 'PENDING',
              feedback: c.feedback || null,
              generalFeedback: c.generalFeedback || null,
            });
            
            // Add assets inside concepts (filtered)
            const activeAssets = c.assets || [];
            activeAssets.forEach((a: any) => {
              allItems.push({
                id: a.id,
                type: 'ASSET',
                approvalStatus: a.approvalStatus || 'PENDING',
                feedback: a.feedback || null,
                generalFeedback: a.generalFeedback || null,
              });
            });
          });
        });
      });

      // Add direct tasks (filtered)
      const activeDirectTasks = filteredProject.tasks || [];
      activeDirectTasks.forEach((t: any) => {
        allItems.push({
          id: t.id,
          type: 'TASK',
          approvalStatus: t.approvalStatus || 'PENDING',
          feedback: t.feedback || null,
          generalFeedback: t.generalFeedback || null,
        });
        
        // Add concepts inside direct tasks (filtered)
        const activeConcepts = t.concepts || [];
        activeConcepts.forEach((c: any) => {
          allItems.push({
            id: c.id,
            type: 'CONCEPT',
            approvalStatus: c.approvalStatus || 'PENDING',
            feedback: c.feedback || null,
            generalFeedback: c.generalFeedback || null,
          });
          
          // Add assets inside concepts (filtered)
          const activeAssets = c.assets || [];
          activeAssets.forEach((a: any) => {
            allItems.push({
              id: a.id,
              type: 'ASSET',
              approvalStatus: a.approvalStatus || 'PENDING',
              feedback: a.feedback || null,
              generalFeedback: a.generalFeedback || null,
            });
          });
        });
      });

      // Add direct concepts (filtered)
      const activeDirectConcepts = filteredProject.concepts || [];
      activeDirectConcepts.forEach((c: any) => {
        allItems.push({
          id: c.id,
          type: 'CONCEPT',
          approvalStatus: c.approvalStatus || 'PENDING',
          feedback: c.feedback || null,
          generalFeedback: c.generalFeedback || null,
        });
        
        // Add assets inside direct concepts (filtered)
        const activeAssets = c.assets || [];
        activeAssets.forEach((a: any) => {
          allItems.push({
            id: a.id,
            type: 'ASSET',
            approvalStatus: a.approvalStatus || 'PENDING',
            feedback: a.feedback || null,
            generalFeedback: a.generalFeedback || null,
          });
        });
      });

      // Process all items and initialize feedback
      allItems.forEach((item: any) => {
        if (item && item.id) {
          if (item.feedback !== undefined && item.feedback !== null) {
            initialFeedback[item.id] = item.feedback || '';
          }
          if (item.generalFeedback !== undefined && item.generalFeedback !== null) {
            initialGeneralFeedback[item.id] = item.generalFeedback || '';
          }
          if (!initialApprovals[item.id]) {
            initialApprovals[item.id] = item.approvalStatus || 'PENDING';
          }
        }
      });

      setApprovals(initialApprovals);
      setFeedback(initialFeedback);
      setGeneralFeedback(initialGeneralFeedback);

      // Initialize section statuses
      const initialSectionStatus: Record<string, string> = {
        project: 'PENDING',
      };

      if (data.project.brief) {
        initialSectionStatus.brief = 'PENDING';
      }

      // Add milestones
      activeMilestones.forEach((m: any) => {
        initialSectionStatus[`milestone-${m.id}`] = 'PENDING';
      });

      // Add tasks
      activeDirectTasks.forEach((t: any) => {
        initialSectionStatus[`task-${t.id}`] = 'PENDING';
      });

      // Add concepts
      activeDirectConcepts.forEach((c: any) => {
        initialSectionStatus[`concept-${c.id}`] = 'PENDING';
      });

      // Also add concepts inside milestones tasks
      activeMilestones.forEach((m: any) => {
        (m.tasks || []).forEach((t: any) => {
          (t.concepts || []).forEach((c: any) => {
            initialSectionStatus[`concept-${c.id}`] = 'PENDING';
          });
        });
      });

      setSectionStatus(initialSectionStatus);

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
    setApprovals((prev) => {
      const newState = { ...prev, [id]: status };
      return newState;
    });
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

  const handleSectionStatusChange = (section: string, status: string) => {
    setSectionStatus(prev => ({ ...prev, [section]: status }));
  };

  // ============================================
  // VALIDATION & SUBMISSION
  // ============================================

  const getAllReviewableItems = (): { id: string; type: string }[] => {
    const items: { id: string; type: string }[] = [];

    if (!project) return items;

    // Helper to collect assets from concepts
    const collectAssetsFromConcepts = (concepts: ConceptData[] | undefined) => {
      if (!concepts) return;
      concepts.forEach((c) => {
        if (c.assets) {
          c.assets.forEach((a) => {
            if (a.id) {
              items.push({ id: a.id, type: 'ASSET' });
            }
          });
        }
      });
    };

    // Collect assets from all concepts
    collectAssetsFromConcepts(project.concepts);
    
    if (project.milestones) {
      project.milestones.forEach((m) => {
        if (m.tasks) {
          m.tasks.forEach((t) => {
            collectAssetsFromConcepts(t.concepts);
          });
        }
      });
    }
    
    if (project.tasks) {
      project.tasks.forEach((t) => {
        collectAssetsFromConcepts(t.concepts);
      });
    }

    return items;
  };

  const validateSubmission = () => {
    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    // Check section statuses
    const pendingSections = Object.entries(sectionStatus)
      .filter(([key, status]) => status === 'PENDING')
      .map(([key]) => key);

    if (pendingSections.length > 0) {
      toast.error(`Please review all sections: ${pendingSections.join(', ')}`);
      return false;
    }

    // Check if any revisions_requested section lacks feedback
    const revisionsWithoutFeedback = Object.entries(sectionStatus)
      .filter(([key, status]) => {
        if (status !== 'REVISIONS_REQUESTED') return false;
        
        if (key === 'project') return !projectFeedback.overview?.trim();
        if (key === 'brief') {
          const briefId = project?.brief?.id;
          return briefId ? !feedback[`brief-${briefId}`]?.trim() : false;
        }
        if (key.startsWith('task-')) {
          const taskId = key.replace('task-', '');
          return !feedback[taskId]?.trim();
        }
        if (key.startsWith('milestone-')) {
          const milestoneId = key.replace('milestone-', '');
          return !feedback[milestoneId]?.trim();
        }
        if (key.startsWith('concept-')) {
          const conceptId = key.replace('concept-', '');
          return !feedback[conceptId]?.trim();
        }
        return false;
      })
      .map(([key]) => key);

    if (revisionsWithoutFeedback.length > 0) {
      toast.error(`Please provide feedback for: ${revisionsWithoutFeedback.join(', ')}`);
      return false;
    }

    // Check if any assets have revisions requested but no feedback
    const assetRevisionsWithoutFeedback = Object.entries(approvals)
      .filter(([id, status]) => {
        if (status !== 'REVISIONS_REQUESTED') return false;
        // Check if this is an asset
        const isAsset = getAllReviewableItems().some(item => item.id === id && item.type === 'ASSET');
        if (!isAsset) return false;
        return !feedback[id]?.trim();
      })
      .map(([id]) => id);

    if (assetRevisionsWithoutFeedback.length > 0) {
      toast.error(`Please provide feedback for ${assetRevisionsWithoutFeedback.length} asset(s) that need revisions`);
      return false;
    }

    return true;
  };

  const buildRollupFeedback = () => {
    // Build brief feedback
    const briefText = project?.brief ? feedback[`brief-${project.brief.id}`]?.trim() : undefined;

    // Build milestone feedback as a single string
    const milestoneLines: string[] = [];
    if (project?.milestones) {
      project.milestones.forEach((m) => {
        const text = feedback[m.id]?.trim();
        if (text) milestoneLines.push(`${m.name}: ${text}`);
      });
    }
    const milestoneText = milestoneLines.length > 0 ? milestoneLines.join('\n\n') : null;

    // ✅ Build task feedback as a single string
    const taskLines: string[] = [];
    const seenTaskNames = new Set<string>();
    
    const collectTaskFeedback = (tasks?: TaskData[]) => {
      if (!tasks) return;
      tasks.forEach((t) => {
        const text = feedback[t.id]?.trim();
        if (text && !seenTaskNames.has(t.id)) {
          seenTaskNames.add(t.id);
          const taskTitle = t.title || t.taskType || 'Untitled Task';
          taskLines.push(`${taskTitle}: ${text}`);
        }
      });
    };
    
    // Collect from direct tasks and tasks within milestones
    collectTaskFeedback(project?.tasks);
    if (project?.milestones) {
      project.milestones.forEach((m) => {
        collectTaskFeedback(m.tasks);
      });
    }
    const taskText = taskLines.length > 0 ? taskLines.join('\n\n') : null;

    // Build concept feedback as a single string
    const conceptLines: string[] = [];
    const seenConceptNames = new Set<string>();
    
    const collectConceptFeedback = (concepts?: ConceptData[]) => {
      if (!concepts) return;
      concepts.forEach((c) => {
        const text = feedback[c.id]?.trim();
        if (text && !seenConceptNames.has(c.name)) {
          seenConceptNames.add(c.name);
          conceptLines.push(`${c.name}: ${text}`);
        }
      });
    };
    
    collectConceptFeedback(project?.concepts);
    if (project?.tasks) {
      project.tasks.forEach((t) => collectConceptFeedback(t.concepts));
    }
    if (project?.milestones) {
      project.milestones.forEach((m) => {
        if (m.tasks) {
          m.tasks.forEach((t) => collectConceptFeedback(t.concepts));
        }
      });
    }
    const conceptText = conceptLines.length > 0 ? conceptLines.join('\n\n') : null;

    return {
      overview: projectFeedback.overview?.trim() || null,
      brief: briefText || null,
      overall: projectFeedback.overall?.trim() || null,
      milestones: milestoneText,
      tasks: taskText, // ✅ Added tasks
      concepts: conceptText,
    };
  };

  const handleSubmitReview = async () => {
    // Ensure all items have an approval status
    const items = getAllReviewableItems();
    
    // Auto-approve project
    if (project) {
      setApprovals(prev => ({ ...prev, [project.id]: 'APPROVED' }));
    }
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const isValid = validateSubmission();
    if (!isValid) return;
    setShowSubmitConfirm(true);
  };

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

      // Build rollup feedback
      const rollup = buildRollupFeedback();
      
      const finalProjectFeedback = {
        overview: rollup.overview || null,
        brief: rollup.brief || null,
        overall: rollup.overall || null,
        milestones: rollup.milestones || null,
        tasks: rollup.tasks || null, // ✅ Added
        concepts: rollup.concepts || null,
        sectionStatuses: sectionStatus,
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
    return Object.values(sectionStatus).filter(s => s === 'PENDING').length;
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
  const hasRejections = rejectedCount > 0;
  const hasPending = Object.values(sectionStatus).some(s => s === 'PENDING');
  const totalSections = Object.keys(sectionStatus).length;
  const reviewedSections = Object.values(sectionStatus).filter(s => s !== 'PENDING').length;
  const progress = totalSections > 0 ? (reviewedSections / totalSections) * 100 : 0;

  // Filter active items for display
  const activeMilestones = filterActive(project.milestones);
  const activeTasks = filterActive(project.tasks);
  const activeConcepts = filterActive(project.concepts);

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
                  <span>Expires: {safeFormatDate(linkData.expiresAt)}</span>
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
                    Progress: {totalSections - pendingCount}/{totalSections} sections reviewed
                  </span>
                  <span className="text-slate-500">
                    {hasPending ? `⚠️ ${pendingCount} pending` : '✅ All sections reviewed'}
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
                  <Badge className={`${
                    sectionStatus.project === 'APPROVED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : sectionStatus.project === 'REVISIONS_REQUESTED' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } text-[9px]`}>
                    {sectionStatus.project === 'APPROVED' 
                      ? '✓ Approved' 
                      : sectionStatus.project === 'REVISIONS_REQUESTED' 
                      ? '⚠️ Revisions' 
                      : '⏳ Pending'}
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
                        {safeFormatDate(project.targetDeadline)}
                      </p>
                    </div>
                  </div>

                  {/* Project Status Controls */}
                  <div className="bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Project Status</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSectionStatusChange('project', 'APPROVED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          sectionStatus.project === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve Project
                      </button>
                      <button
                        onClick={() => handleSectionStatusChange('project', 'REVISIONS_REQUESTED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          sectionStatus.project === 'REVISIONS_REQUESTED'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Request Revisions
                      </button>
                    </div>
                    {sectionStatus.project === 'REVISIONS_REQUESTED' && !projectFeedback.overview?.trim() && (
                      <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please provide feedback for the revision request
                      </p>
                    )}
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
              const brief = project.brief;
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
                      <Badge className={`${
                        sectionStatus.brief === 'APPROVED' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : sectionStatus.brief === 'REVISIONS_REQUESTED' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      } text-[9px]`}>
                        {sectionStatus.brief === 'APPROVED' 
                          ? '✓ Approved' 
                          : sectionStatus.brief === 'REVISIONS_REQUESTED' 
                          ? '⚠️ Revisions' 
                          : '⏳ Pending'}
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

                      {/* Brief Status Controls */}
                      <div className="bg-slate-900/30 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-2">Brief Status</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              handleSectionStatusChange('brief', 'APPROVED');
                              handleApprovalChange(`brief-${brief.id}`, 'APPROVED');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              sectionStatus.brief === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve Brief
                          </button>
                          <button
                            onClick={() => {
                              handleSectionStatusChange('brief', 'REVISIONS_REQUESTED');
                              handleApprovalChange(`brief-${brief.id}`, 'REVISIONS_REQUESTED');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              sectionStatus.brief === 'REVISIONS_REQUESTED'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Request Revisions
                          </button>
                        </div>
                        {sectionStatus.brief === 'REVISIONS_REQUESTED' && !feedback[`brief-${brief.id}`]?.trim() && (
                          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Please provide feedback for the revision request
                          </p>
                        )}
                      </div>

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
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ============================================
                MILESTONES
                ============================================ */}
            {activeMilestones.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => toggleSection('milestones')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Milestones</h2>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                      {activeMilestones.length} milestones
                    </Badge>
                    <Badge className={`${
                      Object.entries(sectionStatus).filter(([key]) => key.startsWith('milestone-')).every(([_, status]) => status === 'APPROVED')
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('milestone-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    } text-[9px]`}>
                      {Object.entries(sectionStatus).filter(([key]) => key.startsWith('milestone-')).every(([_, status]) => status === 'APPROVED')
                        ? '✓ All Approved'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('milestone-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? '⚠️ Some Revisions'
                        : '⏳ In Progress'}
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.milestones ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.milestones && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4">
                    {activeMilestones.map((milestone) => {
                      const statusInfo = getStatusConfig(approvals[milestone.id] || 'PENDING');
                      const isExpanded = expandedItems.has(milestone.id);
                      const milestoneStatusKey = `milestone-${milestone.id}`;
                      const milestoneSectionStatus = sectionStatus[milestoneStatusKey] || 'PENDING';

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
                                      <span>Due: {safeFormatDate(milestone.deadline, 'MMM d, yyyy')}</span>
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
                              <Badge className={`${
                                milestoneSectionStatus === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : milestoneSectionStatus === 'REVISIONS_REQUESTED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              } text-[9px]`}>
                                {milestoneSectionStatus === 'APPROVED'
                                  ? '✓ Approved'
                                  : milestoneSectionStatus === 'REVISIONS_REQUESTED'
                                  ? '⚠️ Revisions'
                                  : '⏳ Pending'}
                              </Badge>
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
                              <div className="bg-slate-900/30 rounded-lg p-2">
                                <p className="text-[10px] text-slate-400 mb-1.5">Milestone Status</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(milestoneStatusKey, 'APPROVED');
                                      handleApprovalChange(milestone.id, 'APPROVED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      milestoneSectionStatus === 'APPROVED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                                    }`}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(milestoneStatusKey, 'REVISIONS_REQUESTED');
                                      handleApprovalChange(milestone.id, 'REVISIONS_REQUESTED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      milestoneSectionStatus === 'REVISIONS_REQUESTED'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                    }`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Revisions
                                  </button>
                                </div>
                                {milestoneSectionStatus === 'REVISIONS_REQUESTED' && !feedback[milestone.id]?.trim() && (
                                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Please provide feedback
                                  </p>
                                )}
                              </div>

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
                                              <option value="REVISIONS_REQUESTED">Revisions</option>
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
            {activeConcepts.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => toggleSection('concepts')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Concepts</h2>
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                      {activeConcepts.length} concepts
                    </Badge>
                    <Badge className={`${
                      Object.entries(sectionStatus).filter(([key]) => key.startsWith('concept-')).every(([_, status]) => status === 'APPROVED')
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('concept-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    } text-[9px]`}>
                      {Object.entries(sectionStatus).filter(([key]) => key.startsWith('concept-')).every(([_, status]) => status === 'APPROVED')
                        ? '✓ All Approved'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('concept-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? '⚠️ Some Revisions'
                        : '⏳ In Progress'}
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.concepts ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.concepts && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4">
                    {activeConcepts.map((concept) => {
                      const statusInfo = getStatusConfig(approvals[concept.id] || 'PENDING');
                      const isExpanded = expandedItems.has(concept.id);
                      const conceptStatusKey = `concept-${concept.id}`;
                      const conceptSectionStatus = sectionStatus[conceptStatusKey] || 'PENDING';

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
                              <Badge className={`${
                                conceptSectionStatus === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : conceptSectionStatus === 'REVISIONS_REQUESTED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              } text-[9px]`}>
                                {conceptSectionStatus === 'APPROVED'
                                  ? '✓ Approved'
                                  : conceptSectionStatus === 'REVISIONS_REQUESTED'
                                  ? '⚠️ Revisions'
                                  : '⏳ Pending'}
                              </Badge>
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
                              <div className="bg-slate-900/30 rounded-lg p-2">
                                <p className="text-[10px] text-slate-400 mb-1.5">Concept Status</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(conceptStatusKey, 'APPROVED');
                                      handleApprovalChange(concept.id, 'APPROVED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      conceptSectionStatus === 'APPROVED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                                    }`}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(conceptStatusKey, 'REVISIONS_REQUESTED');
                                      handleApprovalChange(concept.id, 'REVISIONS_REQUESTED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      conceptSectionStatus === 'REVISIONS_REQUESTED'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                    }`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Revisions
                                  </button>
                                </div>
                                {conceptSectionStatus === 'REVISIONS_REQUESTED' && !feedback[concept.id]?.trim() && (
                                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Please provide feedback
                                  </p>
                                )}
                              </div>

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
                                              onChange={(e) => {
                                                handleApprovalChange(asset.id, e.target.value);
                                              }}
                                              className={`text-xs bg-slate-800 border rounded px-2 py-0.5 text-slate-200 focus:outline-none focus:border-blue-500/50 ${
                                                approvals[asset.id] === 'REVISIONS_REQUESTED' && !feedback[asset.id]?.trim()
                                                  ? 'border-amber-500/50'
                                                  : 'border-slate-700'
                                              }`}
                                            >
                                              <option value="PENDING">Pending</option>
                                              <option value="APPROVED">Approve</option>
                                              <option value="REVISIONS_REQUESTED">Revisions</option>
                                            </select>
                                          </div>
                                        </div>

                                        {approvals[asset.id] === 'REVISIONS_REQUESTED' && (
                                          <div className="mt-2 border-t border-slate-700/30 pt-2">
                                            <label className="text-[10px] text-slate-400 block mb-1">
                                              Revision Feedback <span className="text-amber-400">*</span>
                                            </label>
                                            <textarea
                                              value={feedback[asset.id] || ''}
                                              onChange={(e) => handleFeedbackChange(asset.id, e.target.value)}
                                              placeholder="Describe what changes are needed..."
                                              className={`w-full px-2 py-1 bg-slate-800/50 border rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[40px] ${
                                                !feedback[asset.id]?.trim() 
                                                  ? 'border-amber-500/50' 
                                                  : 'border-slate-700'
                                              }`}
                                              rows={2}
                                            />
                                            {!feedback[asset.id]?.trim() && (
                                              <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Feedback required before submitting
                                              </p>
                                            )}
                                          </div>
                                        )}

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
                TASKS
                ============================================ */}
            {activeTasks.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => toggleSection('tasks')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Tasks</h2>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                      {activeTasks.length} tasks
                    </Badge>
                    <Badge className={`${
                      Object.entries(sectionStatus).filter(([key]) => key.startsWith('task-')).every(([_, status]) => status === 'APPROVED')
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('task-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    } text-[9px]`}>
                      {Object.entries(sectionStatus).filter(([key]) => key.startsWith('task-')).every(([_, status]) => status === 'APPROVED')
                        ? '✓ All Approved'
                        : Object.entries(sectionStatus).filter(([key]) => key.startsWith('task-')).some(([_, status]) => status === 'REVISIONS_REQUESTED')
                        ? '⚠️ Some Revisions'
                        : '⏳ In Progress'}
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.tasks ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.tasks && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4">
                    {activeTasks.map((task) => {
                      const taskStatusKey = `task-${task.id}`;
                      const taskSectionStatus = sectionStatus[taskStatusKey] || 'PENDING';
                      const isExpanded = expandedItems.has(task.id);

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-900/30 border rounded-xl overflow-hidden border-slate-700/30"
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/20 transition-colors"
                            onClick={() => toggleExpand(task.id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-1.5 bg-slate-700/50 rounded-lg shrink-0">
                                <ListChecks className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-100 text-sm truncate">
                                  {task.title || task.taskType}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span>{task.status}</span>
                                  <span>•</span>
                                  <span>{task.priority}</span>
                                  {task.dueDate && (
                                    <>
                                      <span>•</span>
                                      <span>Due: {safeFormatDate(task.dueDate, 'MMM d, yyyy')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`${
                                taskSectionStatus === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : taskSectionStatus === 'REVISIONS_REQUESTED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              } text-[9px]`}>
                                {taskSectionStatus === 'APPROVED'
                                  ? '✓ Approved'
                                  : taskSectionStatus === 'REVISIONS_REQUESTED'
                                  ? '⚠️ Revisions'
                                  : '⏳ Pending'}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-slate-700/50 p-3 space-y-3">
                              <div className="bg-slate-900/30 rounded-lg p-2">
                                <p className="text-[10px] text-slate-400 mb-1.5">Task Status</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(taskStatusKey, 'APPROVED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      taskSectionStatus === 'APPROVED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20'
                                    }`}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleSectionStatusChange(taskStatusKey, 'REVISIONS_REQUESTED');
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                      taskSectionStatus === 'REVISIONS_REQUESTED'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-slate-700/30 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                    }`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Revisions
                                  </button>
                                </div>
                                {taskSectionStatus === 'REVISIONS_REQUESTED' && !feedback[task.id]?.trim() && (
                                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Please provide feedback
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="text-xs text-slate-400 block mb-1">
                                  Task Feedback
                                  <span className="text-slate-500 text-[10px] ml-2">(Optional)</span>
                                </label>
                                <textarea
                                  value={feedback[task.id] || ''}
                                  onChange={(e) => handleFeedbackChange(task.id, e.target.value)}
                                  placeholder="Provide feedback on this task..."
                                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-h-[60px]"
                                  rows={2}
                                />
                              </div>

                              {task.concepts && task.concepts.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700/30">
                                  <p className="text-xs text-slate-400 mb-2">Concepts in this task:</p>
                                  <div className="space-y-2">
                                    {task.concepts.map((concept) => (
                                      <div key={concept.id} className="bg-slate-900/30 rounded-lg p-2">
                                        <div className="flex items-center gap-2">
                                          <Lightbulb className="w-3 h-3 text-amber-400" />
                                          <p className="text-xs text-slate-200 font-medium">{concept.name}</p>
                                          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px]">
                                            {concept.status}
                                          </Badge>
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
                    Please review all sections first
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
                  ⚠️ {pendingCount} section(s) still pending review
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