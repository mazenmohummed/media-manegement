// components/projects/tabs/ConceptsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Archive, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Lightbulb,
  Clock,
  Users,
  FileText,
  ChevronRight,
  MoreVertical,
  Copy,
  Send,
  LayoutGrid,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Concept {
  id: string;
  name: string;
  description: string | null;
  brief: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets?: any[]; // ✅ Make assets optional
  createdAt: string;
  updatedAt: string;
}

interface ConceptsTabProps {
  projectId: string;
}

export function ConceptsTab({ projectId }: ConceptsTabProps) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newConcept, setNewConcept] = useState({ name: '', description: '', brief: '' });
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    fetchConcepts();
  }, [projectId]);

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts`);
      if (!response.ok) throw new Error('Failed to fetch concepts');
      const data = await response.json();
      
      // Handle both response formats
      let conceptsArray: Concept[] = [];
      if (Array.isArray(data)) {
        conceptsArray = data;
      } else if (data.concepts && Array.isArray(data.concepts)) {
        conceptsArray = data.concepts;
      } else if (data.data && Array.isArray(data.data)) {
        conceptsArray = data.data;
      }
      
      // ✅ Ensure assets is always an array
      conceptsArray = conceptsArray.map(concept => ({
        ...concept,
        assets: concept.assets || []
      }));
      
      setConcepts(conceptsArray);
    } catch (error) {
      console.error('Error fetching concepts:', error);
      toast.error('Failed to load concepts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.name.trim()) {
      toast.error('Concept name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newConcept.name.trim(),
          description: newConcept.description.trim() || undefined,
          brief: newConcept.brief.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create concept');
      }

      const concept = await response.json();
      setConcepts([{ ...concept, assets: concept.assets || [] }, ...concepts]);
      setShowCreateModal(false);
      setNewConcept({ name: '', description: '', brief: '' });
      toast.success('Concept created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create concept');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    if (!confirm('Are you sure you want to delete this concept? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/concepts/${conceptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete concept');
      }

      setConcepts(concepts.filter(c => c.id !== conceptId));
      toast.success('Concept deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete concept');
    }
  };

  const handleStatusChange = async (conceptId: string, status: Concept['status']) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts/${conceptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await fetchConcepts();
      toast.success(`Concept ${status.replace('_', ' ').toLowerCase()} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleViewConcept = (conceptId: string) => {
    if (!projectId || !conceptId) {
      toast.error('Invalid project or concept ID');
      return;
    }
    router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}`);
  };

  const handleEditConcept = (conceptId: string) => {
    if (!projectId || !conceptId) {
      toast.error('Invalid project or concept ID');
      return;
    }
    router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}/edit`);
  };

  const getStatusActions = (concept: Concept) => {
    const actions: { label: string; action: () => void; variant: 'primary' | 'success' | 'danger' | 'warning' | 'default' }[] = [];

    switch (concept.status) {
      case 'DRAFT':
        actions.push({
          label: 'Submit for Review',
          action: () => handleStatusChange(concept.id, 'IN_REVIEW'),
          variant: 'primary',
        });
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange(concept.id, 'ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'IN_REVIEW':
        actions.push({
          label: 'Approve',
          action: () => handleStatusChange(concept.id, 'APPROVED'),
          variant: 'success',
        });
        actions.push({
          label: 'Reject',
          action: () => handleStatusChange(concept.id, 'REJECTED'),
          variant: 'danger',
        });
        break;
      case 'APPROVED':
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange(concept.id, 'ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'REJECTED':
        actions.push({
          label: 'Archive',
          action: () => handleStatusChange(concept.id, 'ARCHIVED'),
          variant: 'default',
        });
        break;
      case 'ARCHIVED':
        actions.push({
          label: 'Restore',
          action: () => handleStatusChange(concept.id, 'DRAFT'),
          variant: 'warning',
        });
        break;
      default:
        break;
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500 text-sm">Loading concepts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Creative Concepts
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Explore and manage multiple creative directions for this project
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${projectId}/concepts/compare`}>
            <Button variant="outline" size="sm" className="border-blue-600/30 text-blue-400 hover:bg-blue-950/20">
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Compare All
            </Button>
          </Link>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Concept
          </Button>
        </div>
      </div>

      {/* Concepts Grid */}
      {concepts.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
          <Lightbulb className="mx-auto h-12 w-12 text-zinc-600" />
          <h3 className="mt-3 text-sm font-medium text-zinc-300">No concepts yet</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            Create your first creative concept to start exploring different directions for this project.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            size="sm"
            className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Concept
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {concepts.map((concept) => {
            const status = statusConfig[concept.status];
            const statusActions = getStatusActions(concept);
            // ✅ Safe access with null check
            const assetCount = concept.assets?.length || 0;
            
            return (
              <div
                key={concept.id}
                className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className={`${status.bg} border font-mono text-[10px] ${status.color}`}>
                        <span className="flex items-center gap-1">
                          {status.icon}
                          {status.label}
                        </span>
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-zinc-100 truncate">
                      {concept.name}
                    </h3>
                    {concept.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {concept.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {assetCount} assets
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(concept.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleViewConcept(concept.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                      title="View Concept"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditConcept(concept.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                      title="Edit Concept"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConcept(concept.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Delete Concept"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Actions */}
                {statusActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/60">
                    {statusActions.map((action, idx) => {
                      const variantStyles = {
                        primary: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
                        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
                        danger: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
                        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
                        default: 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-700/60',
                      };
                      
                      return (
                        <button
                          key={idx}
                          onClick={action.action}
                          className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${variantStyles[action.variant]}`}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Lightbulb className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">New Creative Concept</h2>
                <p className="text-xs text-zinc-500">Define a new creative direction for this project</p>
              </div>
            </div>

            <form onSubmit={handleCreateConcept}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Concept Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newConcept.name}
                    onChange={(e) => setNewConcept({ ...newConcept, name: e.target.value })}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="e.g., Concept A - Modern Minimalist"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={newConcept.description}
                    onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    placeholder="Describe the creative direction, key ideas, and rationale..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Brief
                  </label>
                  <textarea
                    value={newConcept.brief}
                    onChange={(e) => setNewConcept({ ...newConcept, brief: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    placeholder="Creative brief for this concept..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? 'Creating...' : 'Create Concept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}