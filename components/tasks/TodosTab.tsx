// components/tasks/TodosTab.tsx
"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface Todo {
  id: string;
  text: string;
  description: string | null;
  completed: boolean;
  priority: string;
  order: number;
  dueDate: string | null;
  createdBy: User | null;
}

interface TodosTabProps {
  taskId: string;
  todos: Todo[];
  onUpdate: () => void;
}

export function TodosTab({ taskId, todos, onUpdate }: TodosTabProps) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        setNewText("");
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, { method: "DELETE" });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-300">Subtasks</span>
          <span className="text-xs text-zinc-500">
            {completedCount}/{todos.length} done
          </span>
        </div>
        {todos.length > 0 && (
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <form onSubmit={addTodo} className="flex items-center gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a subtask..."
          className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500 flex-1"
        />
        <Button
          type="submit"
          disabled={adding || !newText.trim()}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </form>

      <div className="space-y-1">
        {todos.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">No subtasks yet.</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 group"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  todo.completed
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "border-zinc-600 hover:border-zinc-400"
                }`}
              >
                {todo.completed && <Check className="w-3 h-3" />}
              </button>
              <span
                className={`text-sm flex-1 ${
                  todo.completed ? "text-zinc-600 line-through" : "text-zinc-300"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}