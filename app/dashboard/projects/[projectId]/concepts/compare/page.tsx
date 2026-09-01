'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  FileText,
  Image,
  ChevronRight,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Grid3x3,
  List,
  Filter,
  Search,
  LayoutGrid,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Concept {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets: any[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<Concept['status'], { label: string; color: string; bg: string; icon: React.ReactNode; order: number }> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    order: 0,
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
    order: 1,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    order: 2,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
    order: 3,
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/50 border-zinc-700',
    icon: <Archive className="w-3.5 h-3.5" />,
    order: 4,
  },
};

export default function ConceptComparePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'name' | 'status'>('created');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      toast.error('Invalid project ID');
      router.push('/dashboard/projects');
      return;
    }
    fetchConcepts();
  }, [projectId]);

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts`);
      if (!response.ok) throw new Error('Failed to fetch concepts');
      const data = await response.json();
      setConcepts(data);
    } catch (error) {
      console.error('Error fetching concepts:', error);
      toast.error('Failed to load concepts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    if (!confirm('Are you sure you want to delete this concept?')) return;

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

  const handleSubmitAllDrafts = async () => {
    const draftConcepts = concepts.filter(c => c.status === 'DRAFT');
    if (draftConcepts.length === 0) {
      toast.error('No draft concepts to submit');
      return;
    }

    const promise = Promise.all(
      draftConcepts.map(c => 
        fetch(`/api/projects/${projectId}/concepts/${c.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_REVIEW' }),
        })
      )
    );

    await toast.promise(promise, {
      loading: `Submitting ${draftConcepts.length} concept${draftConcepts.length > 1 ? 's' : ''}...`,
      success: `Successfully submitted ${draftConcepts.length} concept${draftConcepts.length > 1 ? 's' : ''} for review`,
      error: 'Failed to submit some concepts',
    });

    await fetchConcepts();
  };

  // Filter and sort concepts
  const filteredConcepts = concepts
    .filter(concept => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          concept.name.toLowerCase().includes(searchLower) ||
          (concept.description?.toLowerCase().includes(searchLower) || false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && concept.status !== filterStatus) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return statusConfig[a.status].order - statusConfig[b.status].order;
        default:
          return 0;
      }
    });

  // Stats
  const totalConcepts = concepts.length;
  const draftCount = concepts.filter(c => c.status === 'DRAFT').length;
  const reviewCount = concepts.filter(c => c.status === 'IN_REVIEW').length;
  const approvedCount = concepts.filter(c => c.status === 'APPROVED').length;
  const rejectedCount = concepts.filter(c => c.status === 'REJECTED').length;
  const archivedCount = concepts.filter(c => c.status === 'ARCHIVED').length;

  // Get all unique statuses for filter
  const statusOptions = ['all', ...new Set(concepts.map(c => c.status))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading concepts...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href={`/dashboard/projects/${projectId}?tab=concepts`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Concepts
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <LayoutGrid className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Concept Comparison</h1>
              <p className="text-sm text-zinc-500">
                Compare all creative directions side by side
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${projectId}/concepts/new`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Concept
            </Button>
          </Link>
          <Button
            onClick={fetchConcepts}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ─── Stats Bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-zinc-100">{totalConcepts}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-400">{draftCount}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Draft</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{reviewCount}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">In Review</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Approved</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{rejectedCount + archivedCount}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Rejected/Archived</p>
        </div>
      </div>

      {/* ─── Filters & Controls ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search concepts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            All ({totalConcepts})
          </button>
          {statusOptions.filter(s => s !== 'all').map((status) => {
            const config = statusConfig[status as Concept['status']];
            const count = concepts.filter(c => c.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterStatus === status
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {config.icon}
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort & View Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="created">Sort by Created</option>
            <option value="updated">Sort by Updated</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
          </select>
          <div className="flex border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Concepts Grid ────────────────────────────────────────────────────── */}
      {filteredConcepts.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
          {concepts.length === 0 ? (
            <>
              <Lightbulb className="mx-auto h-12 w-12 text-zinc-600" />
              <h3 className="mt-3 text-sm font-medium text-zinc-300">No concepts yet</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Create your first creative concept to start exploring different directions.
              </p>
              <Link href={`/dashboard/projects/${projectId}/concepts/new`}>
                <Button variant="outline" size="sm" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Concept
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Search className="mx-auto h-12 w-12 text-zinc-600" />
              <h3 className="mt-3 text-sm font-medium text-zinc-300">No matching concepts</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Try adjusting your filters or search terms
              </p>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                variant="outline"
                size="sm"
                className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Clear filters
              </Button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // ─── Grid View ────────────────────────────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConcepts.map((concept) => {
            const status = statusConfig[concept.status];
            const isExpanded = expandedDescription === concept.id;

            return (
              <div
                key={concept.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-zinc-100 truncate">
                        {concept.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${status.bg} border font-mono ${status.color} text-[10px]`}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          {concept.assets.length} assets
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/dashboard/projects/${projectId}/concepts/${concept.id}`}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/dashboard/projects/${projectId}/concepts/${concept.id}`}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteConcept(concept.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Description */}
                  {concept.description && (
                    <div>
                      <p className={`text-xs text-zinc-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {concept.description}
                      </p>
                      {concept.description.length > 150 && (
                        <button
                          onClick={() => setExpandedDescription(isExpanded ? null : concept.id)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(concept.updatedAt), 'MMM d, yyyy')}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {concept.assets.length} assets
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {concept.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStatusChange(concept.id, 'IN_REVIEW')}
                        className="text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        Submit Review
                      </button>
                    )}
                    {concept.status === 'IN_REVIEW' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(concept.id, 'APPROVED')}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(concept.id, 'REJECTED')}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {concept.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleStatusChange(concept.id, 'ARCHIVED')}
                        className="text-[10px] px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
                      >
                        Archive
                      </button>
                    )}
                    {concept.status === 'ARCHIVED' && (
                      <button
                        onClick={() => handleStatusChange(concept.id, 'DRAFT')}
                        className="text-[10px] px-2.5 py-1 rounded-full border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ─── List View ────────────────────────────────────────────────────────
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-medium">Concept</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assets</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredConcepts.map((concept) => {
                  const status = statusConfig[concept.status];
                  return (
                    <tr key={concept.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{concept.name}</p>
                          {concept.description && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{concept.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${status.bg} border font-mono ${status.color} text-[10px]`}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{concept.assets.length}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {format(new Date(concept.updatedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/projects/${projectId}/concepts/${concept.id}/overview`}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/projects/${projectId}/concepts/${concept.id}`}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteConcept(concept.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      {filteredConcepts.length > 0 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Showing {filteredConcepts.length} of {concepts.length} concepts</span>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmitAllDrafts}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Submit All Drafts
            </Button>
            <Link href={`/dashboard/projects/${projectId}/concepts/new`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Concept
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}