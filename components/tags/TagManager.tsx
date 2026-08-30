// components/tags/TagManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Edit2, Trash2, Check, Loader2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number; projects: number };
}

interface TagManagerProps {
  onTagsChange?: () => void;
  selectedTagIds?: string[];
  onSelectTag?: (tagId: string) => void;
  onDeselectTag?: (tagId: string) => void;
  multiSelect?: boolean;
}

export function TagManager({ 
  onTagsChange, 
  selectedTagIds = [], 
  onSelectTag, 
  onDeselectTag,
  multiSelect = true 
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366F1");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
      setError("Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (res.ok) {
        setNewTagName("");
        setNewTagColor("#6366F1");
        setShowCreate(false);
        await fetchTags();
        if (onTagsChange) onTagsChange();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tag");
      }
    } catch (err) {
      setError("Failed to create tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    if (!editTagName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tagId,
          name: editTagName.trim(),
          color: editTagColor,
        }),
      });

      if (res.ok) {
        setEditingTagId(null);
        await fetchTags();
        if (onTagsChange) onTagsChange();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tag");
      }
    } catch (err) {
      setError("Failed to update tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      const res = await fetch(`/api/tags?id=${tagId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchTags();
        if (onTagsChange) onTagsChange();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete tag");
      }
    } catch (err) {
      setError("Failed to delete tag");
    }
  };

  const handleTagClick = (tagId: string) => {
    if (!onSelectTag || !onDeselectTag) return;

    if (multiSelect) {
      if (selectedTagIds.includes(tagId)) {
        onDeselectTag(tagId);
      } else {
        onSelectTag(tagId);
      }
    } else {
      if (selectedTagIds.includes(tagId)) {
        onDeselectTag(tagId);
      } else {
        onSelectTag(tagId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Tag List */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              selectedTagIds.includes(tag.id)
                ? "ring-2 ring-offset-1 ring-offset-zinc-900"
                : ""
            }`}
            style={{
              backgroundColor: `${tag.color}20`,
              borderColor: selectedTagIds.includes(tag.id) ? tag.color : `${tag.color}40`,
            }}
          >
            {editingTagId === tag.id ? (
              // Edit Mode
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editTagColor}
                  onChange={(e) => setEditTagColor(e.target.value)}
                  className="w-5 h-5 rounded-full border border-zinc-700 cursor-pointer"
                />
                <Input
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="h-6 text-xs bg-zinc-950 border-zinc-700 text-zinc-100 w-24 focus-visible:ring-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateTag(tag.id);
                    if (e.key === "Escape") setEditingTagId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdateTag(tag.id)}
                  disabled={isSubmitting}
                  className="p-0.5 hover:text-emerald-400 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
                <button
                  onClick={() => setEditingTagId(null)}
                  className="p-0.5 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            ) : (
              // View Mode
              <>
                <button
                  onClick={() => handleTagClick(tag.id)}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: tag.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  {tag._count && (
                    <span className="text-[9px] text-zinc-500 font-normal">
                      ({tag._count.tasks + tag._count.projects})
                    </span>
                  )}
                </button>

                {/* Admin Actions */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      setEditingTagId(tag.id);
                      setEditTagName(tag.name);
                      setEditTagColor(tag.color);
                    }}
                    className="p-0.5 hover:text-blue-400 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-zinc-500 hover:text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-0.5 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                  </button>
                </div>

                {/* Selection indicator */}
                {selectedTagIds.includes(tag.id) && (
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
              </>
            )}
          </div>
        ))}

        {/* Create Tag Button */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tag
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-900">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-5 h-5 rounded-full border border-zinc-700 cursor-pointer"
            />
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag..."
              className="h-6 text-xs bg-transparent border-0 text-zinc-100 w-24 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag();
                if (e.key === "Escape") {
                  setShowCreate(false);
                  setNewTagName("");
                }
              }}
            />
            <button
              onClick={handleCreateTag}
              disabled={isSubmitting || !newTagName.trim()}
              className="p-0.5 hover:text-emerald-400 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewTagName("");
              }}
              className="p-0.5 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        )}
      </div>

      {tags.length === 0 && !showCreate && (
        <p className="text-xs text-zinc-600 italic">No tags created yet.</p>
      )}
    </div>
  );
}