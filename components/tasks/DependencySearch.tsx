// components/tasks/DependencySearch.tsx
"use client";

import { useState } from "react";
import { Search, Link2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TaskDependency {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
}

interface DependencySearchProps {
  taskId: string;
  onAdd: (depId: string) => Promise<void>;
  onUpdate: () => void;
}

export function DependencySearch({ taskId, onAdd, onUpdate }: DependencySearchProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TaskDependency[]>([]);
  const [searching, setSearching] = useState(false);

  const searchTasks = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(q)}&exclude=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (depId: string) => {
    await onAdd(depId);
    setSearch("");
    setResults([]);
    onUpdate();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            searchTasks(e.target.value);
          }}
          placeholder="Search tasks to link..."
          className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
        />
      </div>
      {searching && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        </div>
      )}
      {results.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleAdd(r.id)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 text-left transition-colors"
            >
              <div>
                <p className="text-sm text-zinc-300">{r.title ?? "Untitled"}</p>
                <p className="text-[10px] text-zinc-600">{r.taskNo ?? r.id.slice(0, 8)}</p>
              </div>
              <Link2 className="w-3.5 h-3.5 text-zinc-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}