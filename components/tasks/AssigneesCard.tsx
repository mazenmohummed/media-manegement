// components/tasks/AssigneesCard.tsx
"use client";

import { useState } from "react";
import { Users, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface AssigneesCardProps {
  taskId: string;
  assignees: User[];
  onUpdate: () => void;
}

export function AssigneesCard({ taskId, assignees, onUpdate }: AssigneesCardProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const addAssignee = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setShowAdd(false);
        setSearch("");
        setUsers([]);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeAssignee = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees?userId=${userId}`, { method: "DELETE" });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" /> Assignees
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-zinc-500 hover:text-zinc-300"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="pl-8 bg-zinc-950 border-zinc-800 text-zinc-100 text-sm focus-visible:ring-purple-500 h-8"
            />
          </div>
          {searching && <p className="text-xs text-zinc-500">Searching...</p>}
          {users.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addAssignee(u.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300">{u.name}</p>
                    <p className="text-[10px] text-zinc-600">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {assignees.length === 0 ? (
          <p className="text-xs text-zinc-600">No assignees.</p>
        ) : (
          assignees.map((a) => (
            <div key={a.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{a.name}</p>
                  <p className="text-[10px] text-zinc-600">{a.role}</p>
                </div>
              </div>
              <button
                onClick={() => removeAssignee(a.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}