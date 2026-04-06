"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, GripVertical } from "lucide-react";

interface Todo {
  id: string;
  _id?: string;
  text: string;
  completed: boolean;
  priority: string;
}

interface TodoListProps {
  taskId: string;
  todos: Todo[];
  onUpdate: () => void;
  onCommit: () => void;
}

export const TodoList = ({ taskId, todos, onUpdate, onCommit }: TodoListProps) => {
  const [newTodo, setNewTodo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Local state to manage "instant" updates
  const [localTodos, setLocalTodos] = useState(todos);

  React.useEffect(() => {
    setLocalTodos(todos);
  }, [todos]);

  const allCompleted = todos.length > 0 && todos.every((t) => t.completed);

  const toggleTodo = async (todoId: string, currentStatus: boolean) => {
    // 1. Update UI Instantly (Optimistic)
    const updatedStatus = !currentStatus;
    setLocalTodos(prev => 
      prev.map(t => t.id === todoId ? { ...t, completed: updatedStatus } : t)
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: updatedStatus }),
      });

      if (!response.ok) throw new Error();
      
      // 2. Silently sync with server in background
      onUpdate(); 
    } catch (err) {
      // 3. Rollback if server fails
      setLocalTodos(todos);
      alert("Sync failed. Reverting status.");
    }
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    setIsAdding(true);
    try {
      await fetch(`/api/tasks/${taskId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodo, priority: "MEDIUM" }),
      });
      setNewTodo("");
      onUpdate();
    } finally {
      setIsAdding(false);
    }
  };
  const handleFinalCommit = async () => {
  setIsCommitting(true);
  try {
    await onCommit();
  } finally {
    // We keep it true for a moment to prevent "flicker" 
    // before the parent page re-fetches or redirects
    setIsCommitting(false); 
  }
};

  return (
    <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Operational Checklist
          </h3>
          <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">
            {todos.filter(t => t.completed).length} of {todos.length} Milestones Cleared
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Add a check for empty state */}
        {todos?.length === 0 && (
            <p className="text-[10px] text-center py-4 opacity-40 font-bold uppercase">
            No milestones injected.
            </p>
        )}
        {localTodos?.map((todo) => (
          <div
            key={todo.id} // This will now work perfectly
            onClick={() => toggleTodo(todo.id, todo.completed)}
            className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
              todo.completed 
                ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" 
                : "bg-muted/30 border-border/50 hover:border-blue-500/50"
            }`}
          >
            <div 
            className="flex-shrink-0 cursor-pointer p-1"
            onClick={(e) => {
                e.stopPropagation();
                toggleTodo(todo.id, todo.completed);
            }}
            >
            {todo.completed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 transition-all duration-75 scale-110" />
            ) : (
                <Circle className="w-6 h-6 text-muted-foreground group-hover:text-blue-400 transition-colors" />
            )}
            </div>
            
            <span className={`flex-1 text-xs font-bold uppercase tracking-tight ${
              todo.completed ? "line-through text-muted-foreground" : "text-foreground"
            }`}>
              {todo.text}
            </span>

            {todo.priority === "HIGH" && !todo.completed && (
              <span className="text-[7px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                CRITICAL
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 p-2 bg-muted rounded-2xl border border-border/50 focus-within:border-blue-500/50 transition-all">
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Inject new milestone..."
          className="flex-1 bg-transparent px-3 py-2 text-xs font-bold outline-none"
        />
        <button
          onClick={addTodo}
          disabled={isAdding}
          className="bg-foreground text-background p-2 rounded-xl hover:invert transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Final Action Call */}
      {allCompleted && (
        <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
            <button 
            onClick={handleFinalCommit}
            disabled={isCommitting}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg ${
                isCommitting 
                ? "bg-emerald-800 text-emerald-200 cursor-not-allowed opacity-80" 
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20"
            }`}
            >
            {isCommitting ? (
                <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-emerald-200 border-t-transparent rounded-full animate-spin" />
                Synchronizing Final State...
                </span>
            ) : (
                "All Milestones Met: Commit Final Update"
            )}
            </button>
        </div>
        )}
    </div>
  );
};