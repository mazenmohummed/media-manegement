// components/concepts/ConceptBriefEditor.tsx
'use client';

import { useState } from 'react';
import { Save, X, Edit2, Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface ConceptBriefEditorProps {
  conceptId: string;
  projectId: string;
  initialBrief: string | null;
  onUpdate?: () => void;
}

export function ConceptBriefEditor({ 
  conceptId, 
  projectId, 
  initialBrief, 
  onUpdate 
}: ConceptBriefEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(!initialBrief);
  const [brief, setBrief] = useState(initialBrief || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brief: brief.trim() || null }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save brief');
      }

      toast.success('Brief saved successfully');
      setIsEditing(false);
      setIsCreating(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save brief');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setBrief(initialBrief || '');
  };

  const handleAddBrief = () => {
    setIsCreating(true);
    setIsEditing(true);
    setBrief('');
  };

  // ✅ Show "Add Brief" button when no brief exists
  if (!initialBrief && !isCreating && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-700">
        <FileText className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-400">No brief yet</p>
        <p className="text-xs text-zinc-500 mt-1">Define the creative direction for this concept</p>
        <Button
          onClick={handleAddBrief}
          size="sm"
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Brief
        </Button>
      </div>
    );
  }

  // ✅ Show editor when creating or editing
  if (isEditing || isCreating) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            {isCreating ? 'Create Brief' : 'Edit Brief'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-zinc-400 hover:text-zinc-200"
            disabled={saving}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Enter the creative brief for this concept..."
          rows={6}
          className="bg-zinc-950/60 border-zinc-800 text-zinc-100 resize-none focus:ring-2 focus:ring-emerald-500/50"
          disabled={saving}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !brief.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {isCreating ? 'Create Brief' : 'Save Brief'}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Show brief content when exists
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Creative Brief
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditing(true);
            setBrief(initialBrief || '');
          }}
          className="text-zinc-400 hover:text-zinc-200"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          Edit
        </Button>
      </div>
      <div className="prose prose-invert max-w-none bg-zinc-950/40 rounded-lg p-4 border border-zinc-800">
        <div className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed">
          {initialBrief}
        </div>
      </div>
    </div>
  );
}