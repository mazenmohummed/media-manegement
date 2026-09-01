'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, Copy, Archive, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Concept {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  assets: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ConceptsPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newConcept, setNewConcept] = useState({ name: '', description: '' });

  const statusColors: Record<Concept['status'], string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    IN_REVIEW: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ARCHIVED: 'bg-gray-300 text-gray-600',
  };

  const statusIcons: Record<Concept['status'], React.ReactNode> = {
    DRAFT: <AlertCircle className="w-4 h-4" />,
    IN_REVIEW: <Eye className="w-4 h-4" />,
    APPROVED: <CheckCircle className="w-4 h-4" />,
    REJECTED: <XCircle className="w-4 h-4" />,
    ARCHIVED: <Archive className="w-4 h-4" />,
  };

  useEffect(() => {
    fetchConcepts();
  }, [params.projectId]);

  const fetchConcepts = async () => {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/concepts`);
      if (!response.ok) throw new Error('Failed to fetch concepts');
      const data = await response.json();
      setConcepts(data);
    } catch (error) {
      toast.error('Failed to load concepts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/projects/${params.projectId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConcept),
      });

      if (!response.ok) throw new Error('Failed to create concept');
      
      const concept = await response.json();
      setConcepts([concept, ...concepts]);
      setShowCreateModal(false);
      setNewConcept({ name: '', description: '' });
      toast.success('Concept created successfully');
    } catch (error) {
      toast.error('Failed to create concept');
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    if (!confirm('Are you sure you want to delete this concept?')) return;

    try {
      const response = await fetch(
        `/api/projects/${params.projectId}/concepts/${conceptId}`,
        { method: 'DELETE' }
      );

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
      const response = await fetch(
        `/api/projects/${params.projectId}/concepts/${conceptId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await fetchConcepts();
      toast.success(`Concept status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading concepts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concepts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage multiple creative directions for this project
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Concept
        </button>
      </div>

      {/* Concepts Grid */}
      {concepts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No concepts yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first concept for this project.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Concept
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[concept.status]}`}>
                    {statusIcons[concept.status]}
                    <span className="ml-1">{concept.status.replace('_', ' ')}</span>
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => router.push(`/projects/${params.projectId}/concepts/${concept.id}`)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/projects/${params.projectId}/concepts/${concept.id}/edit`)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConcept(concept.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                  {concept.name}
                </h3>
                {concept.description && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {concept.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span>Assets: {concept.assets.length}</span>
                  <span>•</span>
                  <span>Updated: {format(new Date(concept.updatedAt), 'MMM d, yyyy')}</span>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  {concept.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange(concept.id, 'IN_REVIEW')}
                      className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-full"
                    >
                      Submit for Review
                    </button>
                  )}
                  {concept.status === 'IN_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(concept.id, 'APPROVED')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(concept.id, 'REJECTED')}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-full"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {concept.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => handleStatusChange(concept.id, 'ARCHIVED')}
                      className="text-xs px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full"
                    >
                      Archive
                    </button>
                  )}
                  {concept.status === 'ARCHIVED' && (
                    <button
                      onClick={() => handleStatusChange(concept.id, 'DRAFT')}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Concept</h2>
            <form onSubmit={handleCreateConcept}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concept Name *
                  </label>
                  <input
                    type="text"
                    value={newConcept.name}
                    onChange={(e) => setNewConcept({ ...newConcept, name: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Concept A - Modern Minimalist"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newConcept.description}
                    onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                    rows={4}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe the creative direction..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Create Concept
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}