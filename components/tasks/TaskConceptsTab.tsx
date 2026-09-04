// components/tasks/TaskConceptsTab.tsx - Complete Fixed Version

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  Plus,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Archive,
  Trash2,
  Edit2,
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
  MoreVertical,
  Send,
  Link as LinkIcon,
  Link2,
  Unlink,
  Search as SearchIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskConceptsTabProps {
  taskId: string;
  projectId: string;
  initialConcepts?: Concept[];
  onUpdate?: () => void;
}

interface Concept {
  id: string;
  name: string;
  description: string | null;
  brief: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets: {
    id: string;
    name: string;
    type: string;
    versions: { id: string; versionNo: number }[];
  }[];
  reviewLinks: {
    id: string;
    token: string;
    status: string;
    isActive: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface AvailableConcept {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assetCount: number;
  hasActiveReview: boolean;
  taskId: string | null;
  createdAt: string;
}

const statusConfig: Record<Concept['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  IN_REVIEW: {
    label: 'In Review',
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
  ARCHIVED: {
    label: 'Archived',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/50 border-zinc-700',
    icon: <Archive className="w-3.5 h-3.5" />,
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

export function TaskConceptsTab({ taskId, projectId, initialConcepts = [], onUpdate }: TaskConceptsTabProps) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptDescription, setNewConceptDescription] = useState('');
  const [newConceptBrief, setNewConceptBrief] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Link existing dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [availableConcepts, setAvailableConcepts] = useState<AvailableConcept[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

  // Fetch concepts on mount if no initial data
  useEffect(() => {
    if (initialConcepts.length === 0) {
      fetchConcepts();
    }
  }, [taskId]);

  // Fetch concepts
  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/concepts`);
      if (!response.ok) throw new Error('Failed to fetch concepts');
      const data = await response.json();
      setConcepts(data.concepts || []);
    } catch (error) {
      console.error('Error fetching concepts:', error);
      toast.error('Failed to load concepts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available concepts for linking
  const fetchAvailableConcepts = async () => {
    setLoadingAvailable(true);
    try {
      const url = `/api/projects/${projectId}/concepts?available=true&excludeTask=${taskId}`;
      console.log('Fetching available concepts from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch available concepts');
      }
      
      const data = await response.json();
      console.log('Available concepts response:', data);
      
      // Handle all possible response formats
      let conceptsList: AvailableConcept[] = [];
      if (Array.isArray(data)) {
        conceptsList = data;
      } else if (data.concepts && Array.isArray(data.concepts)) {
        conceptsList = data.concepts;
      } else if (data.data && Array.isArray(data.data)) {
        conceptsList = data.data;
      } else {
        conceptsList = [];
      }
      
      console.log('Available concepts list:', conceptsList);
      setAvailableConcepts(conceptsList);
      
      // Debug: Check all concepts in project if none available
      if (conceptsList.length === 0) {
        const allConceptsRes = await fetch(`/api/projects/${projectId}/concepts`);
        const allConceptsData = await allConceptsRes.json();
        const allConcepts = allConceptsData.concepts || allConceptsData.data || [];
        console.log('All concepts in project:', allConcepts);
        
        if (allConcepts.length > 0) {
          // ✅ Fixed: Added explicit type for the filter callback
          const linkedCount = allConcepts.filter((concept: any) => concept.taskId).length;
          console.log(`Found ${allConcepts.length} concepts, ${linkedCount} linked to tasks`);
        }
      }
    } catch (error) {
      console.error('Error fetching available concepts:', error);
      toast.error('Failed to load available concepts');
    } finally {
      setLoadingAvailable(false);
    }
  };

  // Open link dialog
  const openLinkDialog = () => {
    setShowLinkDialog(true);
    fetchAvailableConcepts();
  };

  // Link concept to task
  const handleLinkConcept = async (conceptId: string) => {
    setLinking(conceptId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link concept');
      }

      const linkedConcept = await response.json();
      setConcepts([linkedConcept, ...concepts]);
      setAvailableConcepts(availableConcepts.filter(c => c.id !== conceptId));
      toast.success('Concept linked successfully!');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link concept');
    } finally {
      setLinking(null);
    }
  };

  // Unlink concept from task
  const handleUnlinkConcept = async (conceptId: string) => {
    if (!confirm('Remove this concept from the task? It will remain available in the project.')) return;

    setUnlinking(conceptId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink concept');
      }

      setConcepts(concepts.filter(c => c.id !== conceptId));
      toast.success('Concept unlinked from task');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink concept');
    } finally {
      setUnlinking(null);
    }
  };

  // Create concept
  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptName.trim()) {
      toast.error('Concept name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newConceptName.trim(),
          description: newConceptDescription.trim() || undefined,
          brief: newConceptBrief.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create concept');
      }

      const newConcept = await response.json();
      setConcepts([newConcept, ...concepts]);
      setShowCreateDialog(false);
      setNewConceptName('');
      setNewConceptDescription('');
      setNewConceptBrief('');
      toast.success('Concept created successfully!');
      
      router.push(`/dashboard/projects/${projectId}/concepts/${newConcept.id}`);
      
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create concept');
    } finally {
      setCreating(false);
    }
  };

  // Delete concept
  const handleDeleteConcept = async (conceptId: string) => {
    if (!confirm('Are you sure you want to delete this concept? This cannot be undone.')) return;

    setDeleting(conceptId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/concepts/${conceptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete concept');
      }

      setConcepts(concepts.filter(c => c.id !== conceptId));
      toast.success('Concept deleted successfully');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete concept');
    } finally {
      setDeleting(null);
    }
  };

  // Filter concepts
  const filteredConcepts = concepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         concept.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || concept.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter available concepts for linking
  const filteredAvailable = availableConcepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                         concept.description?.toLowerCase().includes(linkSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const totalConcepts = concepts.length;
  const approvedCount = concepts.filter(c => c.status === 'APPROVED').length;
  const inReviewCount = concepts.filter(c => c.status === 'IN_REVIEW').length;
  const draftCount = concepts.filter(c => c.status === 'DRAFT').length;
  const rejectedCount = concepts.filter(c => c.status === 'REJECTED').length;
  const archivedCount = concepts.filter(c => c.status === 'ARCHIVED').length;

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
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Concepts
          </h2>
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
            {totalConcepts} concepts
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openLinkDialog}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Link Existing
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Concept
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Create New Concept</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateConcept} className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Concept Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={newConceptName}
                    onChange={(e) => setNewConceptName(e.target.value)}
                    placeholder="e.g., Retro Athletic Theme"
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Description <span className="text-zinc-500 text-[10px]">(Optional)</span>
                  </label>
                  <textarea
                    value={newConceptDescription}
                    onChange={(e) => setNewConceptDescription(e.target.value)}
                    placeholder="Describe the creative direction..."
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Brief <span className="text-zinc-500 text-[10px]">(Optional)</span>
                  </label>
                  <textarea
                    value={newConceptBrief}
                    onChange={(e) => setNewConceptBrief(e.target.value)}
                    placeholder="Creative brief for this concept..."
                    rows={4}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowCreateDialog(false)}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !newConceptName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Concept'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-zinc-100">{totalConcepts}</p>
          <p className="text-xs text-zinc-400">Total</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
          <p className="text-xs text-zinc-400">Approved</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{inReviewCount}</p>
          <p className="text-xs text-zinc-400">In Review</p>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-zinc-400">{draftCount}</p>
          <p className="text-xs text-zinc-400">Draft</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-400">{rejectedCount + archivedCount}</p>
          <p className="text-xs text-zinc-400">Rejected/Archived</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search concepts..."
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
          <option value="DRAFT">Draft</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button
          onClick={fetchConcepts}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Concepts List */}
      {filteredConcepts.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-12 text-center">
          <Lightbulb className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">
            {concepts.length === 0 ? 'No concepts linked to this task' : 'No concepts match your filters'}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            {concepts.length === 0 
              ? 'Create a new concept or link an existing one from the project'
              : 'Try adjusting your search or filters'}
          </p>
          {concepts.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </Button>
              <Button
                onClick={openLinkDialog}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Link Existing
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConcepts.map((concept) => {
            const status = statusConfig[concept.status] || statusConfig.DRAFT;
            const isExpanded = expandedConcept === concept.id;
            const assetCount = concept.assets?.length || 0;
            const hasReviewLinks = concept.reviewLinks?.some(r => r.isActive) || false;

            return (
              <div
                key={concept.id}
                className={`bg-zinc-800/50 border rounded-xl overflow-hidden transition-colors ${
                  concept.status === 'APPROVED'
                    ? 'border-emerald-500/20'
                    : concept.status === 'REJECTED'
                    ? 'border-red-500/20'
                    : concept.status === 'IN_REVIEW'
                    ? 'border-yellow-500/20'
                    : 'border-zinc-700/50'
                }`}
              >
                {/* Concept Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-zinc-100 truncate">
                          {concept.name}
                        </h3>
                        <Badge className={`${status.bg} border ${status.color}`}>
                          <span className="flex items-center gap-1 text-[10px]">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                        {hasReviewLinks && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                            <Send className="w-3 h-3 mr-1" />
                            Client Review
                          </Badge>
                        )}
                      </div>
                      {concept.description && (
                        <p className="text-sm text-zinc-400 mt-1 truncate">
                          {concept.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(concept.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {assetCount} assets
                        </span>
                        {concept.updatedAt && (
                          <span className="flex items-center gap-1">
                            Updated {format(new Date(concept.updatedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/projects/${projectId}/concepts/${concept.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                      </Link>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkConcept(concept.id);
                        }}
                        disabled={unlinking === concept.id}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                        title="Unlink from task"
                      >
                        {unlinking === concept.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/projects/${projectId}/concepts/${concept.id}`)}
                            className="hover:bg-zinc-700 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Concept
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/projects/${projectId}/concepts/${concept.id}/edit`)}
                            className="hover:bg-zinc-700 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteConcept(concept.id)}
                            disabled={deleting === concept.id}
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                          >
                            {deleting === concept.id ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    {/* Brief */}
                    {concept.brief && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Brief</p>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-3">
                          {concept.brief}
                        </p>
                      </div>
                    )}

                    {/* Assets Preview */}
                    {concept.assets && concept.assets.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-2">Assets ({assetCount})</p>
                        <div className="flex flex-wrap gap-2">
                          {concept.assets.slice(0, 5).map((asset) => (
                            <Badge
                              key={asset.id}
                              className="bg-zinc-800 text-zinc-300 border-zinc-700 flex items-center gap-1"
                            >
                              {assetTypeIcons[asset.type] || <File className="w-3 h-3" />}
                              {asset.name}
                              <span className="text-zinc-500 text-[9px]">
                                v{asset.versions?.length || 0}
                              </span>
                            </Badge>
                          ))}
                          {assetCount > 5 && (
                            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">
                              +{assetCount - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Links */}
                    {concept.reviewLinks && concept.reviewLinks.some(r => r.isActive) && (
                      <div className="bg-zinc-900/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-400 mb-1">Active Review Links</p>
                        <div className="space-y-1">
                          {concept.reviewLinks.filter(r => r.isActive).map((link) => (
                            <div key={link.id} className="flex items-center gap-2 text-xs">
                              <LinkIcon className="w-3 h-3 text-purple-400" />
                              <span className="text-zinc-300 font-mono">{link.token.slice(0, 16)}...</span>
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                                Active
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-700/30">
                      <Link href={`/dashboard/projects/${projectId}/concepts/${concept.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View Full Concept
                        </Button>
                      </Link>
                      {concept.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/projects/${projectId}/concepts/${concept.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'IN_REVIEW' }),
                              });
                              if (response.ok) {
                                toast.success('Concept submitted for review');
                                fetchConcepts();
                                if (onUpdate) onUpdate();
                              }
                            } catch (error) {
                              toast.error('Failed to submit for review');
                            }
                          }}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Submit for Review
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link Existing Concept Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Link Existing Concept
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search concepts..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500"
              />
            </div>

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">
                  {availableConcepts.length === 0 
                    ? 'No available concepts in this project'
                    : 'No concepts match your search'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {availableConcepts.length === 0 
                    ? 'All concepts are already linked to this task or none exist'
                    : 'Try adjusting your search'}
                </p>
                {/* ✅ Debug section */}
                <div className="mt-4 text-xs text-zinc-500 space-y-1">
                  <p>Debug info:</p>
                  <p>Project ID: {projectId}</p>
                  <p>Task ID: {taskId}</p>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/projects/${projectId}/concepts`);
                      const data = await res.json();
                      console.log('All concepts:', data);
                      const count = data.concepts?.length || data.data?.length || 0;
                      alert(`Found ${count} concepts in project. Check console for details.`);
                    }}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Click to check concepts in project
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {filteredAvailable.map((concept) => (
                  <div
                    key={concept.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-200 truncate">{concept.name}</h4>
                        <Badge className={`text-[9px] ${
                          concept.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : concept.status === 'IN_REVIEW'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : concept.status === 'ARCHIVED'
                            ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {concept.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{concept.assetCount} assets</span>
                        <span>•</span>
                        <span>{format(new Date(concept.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLinkConcept(concept.id)}
                      disabled={linking === concept.id}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                    >
                      {linking === concept.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          Link
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowLinkDialog(false)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}