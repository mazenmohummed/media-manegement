'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Edit,
  Save,
  X,
  Plus,
  Target,
  Users,
  MessageSquare,
  DollarSign,
  ListChecks,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreativeBrief {
  id: string;
  title: string;
  status: 'DRAFT' | 'PENDING_CLIENT_APPROVAL' | 'APPROVED' | 'REVISIONS_REQUIRED';
  budget: number | null;
  objectives: string;
  audience: string | null;
  keyMessage: string | null;
  deliverables: string[];
  references: string[];
  createdAt: string;
  updatedAt: string;
}

interface BriefTabProps {
  projectId: string;
  currency?: string;
}

const statusConfig: Record<CreativeBrief['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/50 border-zinc-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PENDING_CLIENT_APPROVAL: {
    label: 'Pending Client Approval',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REVISIONS_REQUIRED: {
    label: 'Revisions Required',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

export function BriefTab({ projectId, currency = 'EGP' }: BriefTabProps) {
  const router = useRouter();
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreativeBrief>>({
    title: '',
    objectives: '',
    audience: '',
    keyMessage: '',
    budget: null,
    deliverables: [],
    references: [],
  });
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newReference, setNewReference] = useState('');

  // ─── READ: Fetch Brief ─────────────────────────────────────────────────────
  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`);
      
      if (response.status === 404) {
        // No brief exists yet - this is expected
        setBrief(null);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch brief:', errorText);
        throw new Error(`Failed to fetch brief: ${response.status}`);
      }
      
      const data = await response.json();
      setBrief(data);
      setFormData({
        title: data.title || '',
        objectives: data.objectives || '',
        audience: data.audience || '',
        keyMessage: data.keyMessage || '',
        budget: data.budget || null,
        deliverables: data.deliverables || [],
        references: data.references || [],
      });
    } catch (error) {
      console.error('Error fetching brief:', error);
      setError('Failed to load creative brief. Please try again.');
      toast.error('Failed to load creative brief');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  // ─── CREATE: Create Brief ──────────────────────────────────────────────────
  const handleCreateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Brief title is required');
      return;
    }
    if (!formData.objectives?.trim()) {
      toast.error('Objectives are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          objectives: formData.objectives.trim(),
          audience: formData.audience?.trim() || undefined,
          keyMessage: formData.keyMessage?.trim() || undefined,
          budget: formData.budget || undefined,
          deliverables: formData.deliverables || [],
          references: formData.references || [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create brief');
      }

      const data = await response.json();
      setBrief(data);
      setIsEditing(false);
      toast.success('Creative brief created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create brief');
    } finally {
      setSaving(false);
    }
  };

  // ─── UPDATE: Update Brief ──────────────────────────────────────────────────
  const handleUpdateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Brief title is required');
      return;
    }
    if (!formData.objectives?.trim()) {
      toast.error('Objectives are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          objectives: formData.objectives.trim(),
          audience: formData.audience?.trim() || undefined,
          keyMessage: formData.keyMessage?.trim() || undefined,
          budget: formData.budget || undefined,
          deliverables: formData.deliverables || [],
          references: formData.references || [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update brief');
      }

      const data = await response.json();
      setBrief(data);
      setIsEditing(false);
      toast.success('Creative brief updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update brief');
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE: Delete Brief ──────────────────────────────────────────────────
  const handleDeleteBrief = async () => {
    if (!confirm('Are you sure you want to delete this creative brief? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete brief');
      }

      setBrief(null);
      setIsEditing(false);
      toast.success('Creative brief deleted successfully');
      // Refresh the page state
      await fetchBrief();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete brief');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── UPDATE: Status Change ─────────────────────────────────────────────────
  const handleStatusChange = async (status: CreativeBrief['status']) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      const data = await response.json();
      setBrief(data);
      toast.success(`Brief status updated to ${status.replace('_', ' ')}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ─── Helpers for deliverables and references ──────────────────────────────
  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setFormData(prev => ({
      ...prev,
      deliverables: [...(prev.deliverables || []), newDeliverable.trim()],
    }));
    setNewDeliverable('');
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: (prev.deliverables || []).filter((_, i) => i !== index),
    }));
  };

  const addReference = () => {
    if (!newReference.trim()) return;
    setFormData(prev => ({
      ...prev,
      references: [...(prev.references || []), newReference.trim()],
    }));
    setNewReference('');
  };

  const removeReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      references: (prev.references || []).filter((_, i) => i !== index),
    }));
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading creative brief...
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-3 text-sm font-medium text-zinc-300">Error Loading Brief</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">{error}</p>
        <Button
          onClick={fetchBrief}
          variant="outline"
          size="sm"
          className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Try Again
        </Button>
      </div>
    );
  }

  // ─── No Brief Exists - Show Create Form ──────────────────────────────────
  if (!brief) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-zinc-600" />
          <h3 className="mt-3 text-sm font-medium text-zinc-300">No Creative Brief</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            A creative brief provides essential context for your creative team including 
            objectives, target audience, and key messages.
          </p>
        </div>

        {/* ─── CREATE FORM ──────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-zinc-200 mb-4">Create Creative Brief</h4>
          <form onSubmit={handleCreateBrief} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Brief Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Spring Campaign 2024 Brief"
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Objectives <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={formData.objectives || ''}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                placeholder="What are the key objectives of this project?"
                rows={3}
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Target Audience
              </label>
              <Textarea
                value={formData.audience || ''}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                placeholder="Who is the target audience? Describe demographics, psychographics, etc."
                rows={2}
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Key Message
              </label>
              <Textarea
                value={formData.keyMessage || ''}
                onChange={(e) => setFormData({ ...formData, keyMessage: e.target.value })}
                placeholder="What is the core message you want to communicate?"
                rows={2}
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Budget ({currency})
              </label>
              <Input
                type="number"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || undefined })}
                placeholder="Enter budget amount"
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Deliverables
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  placeholder="Add a deliverable..."
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
                />
                <Button type="button" onClick={addDeliverable} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.deliverables && formData.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.deliverables.map((item, index) => (
                    <Badge key={index} className="bg-zinc-800 text-zinc-300 border-zinc-700 flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                References
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  placeholder="Add a reference URL..."
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReference())}
                />
                <Button type="button" onClick={addReference} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.references && formData.references.length > 0 && (
                <div className="space-y-1">
                  {formData.references.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-zinc-800/30 px-3 py-1.5 rounded-lg">
                      <span className="text-zinc-400 truncate flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeReference(index)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? 'Creating...' : 'Create Brief'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Brief Exists - Show it ──────────────────────────────────────────────
  const status = statusConfig[brief.status];
  const isEditable = brief.status === 'DRAFT' || brief.status === 'REVISIONS_REQUIRED';

  return (
    <div className="space-y-6">
      {/* ─── Brief Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-zinc-100">{brief.title}</h2>
            <Badge className={`${status.bg} border font-mono ${status.color}`}>
              <span className="flex items-center gap-1.5">
                {status.icon}
                {status.label}
              </span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Created {format(new Date(brief.createdAt), 'PPP')} • Updated {format(new Date(brief.updatedAt), 'PPP')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* ─── Status Actions ────────────────────────────────────────────── */}
          {brief.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('PENDING_CLIENT_APPROVAL')}
              disabled={updatingStatus}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {updatingStatus ? 'Updating...' : 'Submit for Client Approval'}
            </Button>
          )}
          {brief.status === 'PENDING_CLIENT_APPROVAL' && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusChange('APPROVED')}
                disabled={updatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {updatingStatus ? 'Updating...' : 'Approve'}
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange('REVISIONS_REQUIRED')}
                disabled={updatingStatus}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertCircle className="w-4 h-4 mr-1.5" />
                {updatingStatus ? 'Updating...' : 'Request Revisions'}
              </Button>
            </>
          )}
          
          {/* ─── Edit Button ────────────────────────────────────────────────── */}
          {isEditable && !isEditing && (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit Brief
            </Button>
          )}
          
          {/* ─── Delete Button ──────────────────────────────────────────────── */}
          <Button
            size="sm"
            onClick={handleDeleteBrief}
            disabled={isDeleting}
            variant="outline"
            className="border-red-800/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* ─── Brief Content ────────────────────────────────────────────────────── */}
      {isEditing ? (
        // ─── EDIT FORM ──────────────────────────────────────────────────────
        <form onSubmit={handleUpdateBrief} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Brief Title <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Objectives <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={formData.objectives || ''}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              rows={3}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Target Audience
            </label>
            <Textarea
              value={formData.audience || ''}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              rows={2}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Key Message
            </label>
            <Textarea
              value={formData.keyMessage || ''}
              onChange={(e) => setFormData({ ...formData, keyMessage: e.target.value })}
              rows={2}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Budget ({currency})
            </label>
            <Input
              type="number"
              value={formData.budget || ''}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || undefined })}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Deliverables
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                placeholder="Add a deliverable..."
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
              />
              <Button type="button" onClick={addDeliverable} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.deliverables && formData.deliverables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.deliverables.map((item, index) => (
                  <Badge key={index} className="bg-zinc-800 text-zinc-300 border-zinc-700 flex items-center gap-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              References
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                placeholder="Add a reference URL..."
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReference())}
              />
              <Button type="button" onClick={addReference} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.references && formData.references.length > 0 && (
              <div className="space-y-1">
                {formData.references.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs bg-zinc-800/30 px-3 py-1.5 rounded-lg">
                    <span className="text-zinc-400 truncate flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeReference(index)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  title: brief.title || '',
                  objectives: brief.objectives || '',
                  audience: brief.audience || '',
                  keyMessage: brief.keyMessage || '',
                  budget: brief.budget || null,
                  deliverables: brief.deliverables || [],
                  references: brief.references || [],
                });
              }}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      ) : (
        // ─── VIEW MODE ──────────────────────────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Objectives */}
          <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60 md:col-span-2">
            <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5" />
              Objectives
            </h3>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{brief.objectives}</p>
          </div>

          {/* Audience */}
          {brief.audience && (
            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60">
              <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5" />
                Target Audience
              </h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{brief.audience}</p>
            </div>
          )}

          {/* Key Message */}
          {brief.keyMessage && (
            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60">
              <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Key Message
              </h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{brief.keyMessage}</p>
            </div>
          )}

          {/* Budget */}
          {brief.budget && (
            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60">
              <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                Budget
              </h3>
              <p className="text-sm text-zinc-300 font-medium">
                {currency} {brief.budget.toLocaleString()}
              </p>
            </div>
          )}

          {/* Deliverables */}
          {brief.deliverables && brief.deliverables.length > 0 && (
            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60">
              <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <ListChecks className="w-3.5 h-3.5" />
                Deliverables
              </h3>
              <ul className="space-y-1">
                {brief.deliverables.map((item, index) => (
                  <li key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          {brief.references && brief.references.length > 0 && (
            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/60 md:col-span-2">
              <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                <Globe className="w-3.5 h-3.5" />
                References
              </h3>
              <ul className="space-y-1">
                {brief.references.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {item}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}