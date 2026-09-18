// components/production/ProductionMetadataAttacher.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductionMetadataAttacherProps {
  projectId: string;
  conceptId: string;
  assetId: string;
  onUpdate?: (data: any) => void;
}

const PRODUCTION_STAGES = [
  { value: 'pre-production', label: 'Pre-Production' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'editing', label: 'Editing' },
  { value: 'color_grading', label: 'Color Grading' },
  { value: 'sound_design', label: 'Sound Design' },
  { value: 'motion_graphics', label: 'Motion Graphics' },
  { value: 'vfx', label: 'VFX' },
  { value: 'final_delivery', label: 'Final Delivery' },
];

export function ProductionMetadataAttacher({
  projectId,
  conceptId,
  assetId,
  onUpdate,
}: ProductionMetadataAttacherProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState({
    taskId: '',
    milestoneId: '',
    productionStage: '',
    tags: [] as string[],
    clientAccessible: false,
    camera: '',
    director: '',
    shootDate: '',
    dp: '',
    location: '',
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, [assetId]);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/attach-production`
      );
      if (!response.ok) throw new Error('Failed to fetch metadata');
      const data = await response.json();
      if (data.success) {
        const asset = data.asset;
        setMetadata({
          taskId: asset.taskId || '',
          milestoneId: asset.milestoneId || '',
          productionStage: asset.productionStage || '',
          tags: asset.tags?.map((t: any) => t.name) || [],
          clientAccessible: asset.clientAccessible || false,
          camera: asset.productionMetadata?.camera || '',
          director: asset.productionMetadata?.director || '',
          shootDate: asset.productionMetadata?.shootDate || '',
          dp: asset.productionMetadata?.dp || '',
          location: asset.productionMetadata?.location || '',
        });
      }
    } catch (error) {
      toast.error('Failed to load production metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/attach-production`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: metadata.taskId || null,
            milestoneId: metadata.milestoneId || null,
            productionStage: metadata.productionStage || null,
            tags: metadata.tags,
            clientAccessible: metadata.clientAccessible,
            productionMetadata: {
              camera: metadata.camera || null,
              director: metadata.director || null,
              shootDate: metadata.shootDate || null,
              dp: metadata.dp || null,
              location: metadata.location || null,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save metadata');
      }

      const data = await response.json();
      toast.success('Production metadata saved successfully');
      if (onUpdate) onUpdate(data.asset);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProduction = async () => {
    if (!confirm('Remove all production metadata from this asset?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/attach-production`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove metadata');

      toast.success('Production metadata removed');
      await fetchMetadata();
      if (onUpdate) onUpdate(null);
    } catch (error) {
      toast.error('Failed to remove production metadata');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-400">Loading production metadata...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Production Metadata</h3>
        <Button
          onClick={handleRemoveProduction}
          variant="outline"
          size="sm"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Remove All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Production Stage */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Production Stage</Label>
          <Select
            value={metadata.productionStage}
            onValueChange={(value) => setMetadata(prev => ({ ...prev, productionStage: value }))}
          >
            <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {PRODUCTION_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client Accessible */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Client Access</Label>
          <Select
            value={metadata.clientAccessible ? 'true' : 'false'}
            onValueChange={(value) => setMetadata(prev => ({ ...prev, clientAccessible: value === 'true' }))}
          >
            <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100">
              <SelectValue placeholder="Client access" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="true">🔓 Client Accessible</SelectItem>
              <SelectItem value="false">🔒 Internal Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Camera */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Camera</Label>
          <Input
            value={metadata.camera}
            onChange={(e) => setMetadata(prev => ({ ...prev, camera: e.target.value }))}
            placeholder="e.g., Arri Alexa, RED, Sony FX9"
            className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Director */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Director</Label>
          <Input
            value={metadata.director}
            onChange={(e) => setMetadata(prev => ({ ...prev, director: e.target.value }))}
            placeholder="Director name"
            className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* DP */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Director of Photography</Label>
          <Input
            value={metadata.dp}
            onChange={(e) => setMetadata(prev => ({ ...prev, dp: e.target.value }))}
            placeholder="DP name"
            className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Shoot Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Shoot Date</Label>
          <Input
            type="date"
            value={metadata.shootDate}
            onChange={(e) => setMetadata(prev => ({ ...prev, shootDate: e.target.value }))}
            className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-zinc-400">Location</Label>
          <Input
            value={metadata.location}
            onChange={(e) => setMetadata(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Shoot location"
            className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-xs text-zinc-400">Production Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tag..."
            className="flex-1 bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
          <Button
            onClick={addTag}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {metadata.tags.map((tag) => (
            <Badge
              key={tag}
              className="bg-zinc-700 text-zinc-200 hover:bg-zinc-600 flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {metadata.tags.length === 0 && (
            <span className="text-xs text-zinc-500">No tags added</span>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {saving ? (
          <>Saving...</>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Production Metadata
          </>
        )}
      </Button>
    </div>
  );
}