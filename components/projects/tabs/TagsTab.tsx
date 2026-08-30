"use client";

import { useEffect, useState } from "react";
import { Tag as TagIcon, Loader2, Plus, X } from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  color: string;
  applied: boolean;
}

export function TagsTab({ projectId }: { projectId: string }) {
  const [tags, setTags] = useState<TagItem[] | null>(null);
  const [newTag, setNewTag] = useState("");

  const load = () =>
    fetch(`/api/projects/${projectId}/tags`)
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => setTags([]));

  useEffect(() => { load(); }, [projectId]);

  const toggle = async (tag: TagItem) => {
    setTags((prev) => prev?.map((t) => (t.id === tag.id ? { ...t, applied: !t.applied } : t)) ?? null);
    if (tag.applied) {
      await fetch(`/api/projects/${projectId}/tags?tagId=${tag.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/projects/${projectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
    }
  };

  const createAndApply = async () => {
    if (!newTag.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag }),
    });
    if (res.ok) {
      setNewTag("");
      load();
    }
  };

  if (tags === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createAndApply()}
          placeholder="New tag name"
          className="flex-1 bg-zinc-950/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          onClick={createAndApply}
          disabled={!newTag.trim()}
          className="flex items-center gap-1 text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 rounded-md"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <TagIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tags in this agency yet.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggle(tag)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-opacity"
              style={{
                backgroundColor: `${tag.color}${tag.applied ? "30" : "10"}`,
                color: tag.color,
                border: `1px solid ${tag.color}${tag.applied ? "60" : "20"}`,
                opacity: tag.applied ? 1 : 0.6,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
              {tag.applied && <X size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}