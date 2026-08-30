// components/tasks/ProgressIndicator.tsx
"use client";

interface ProgressIndicatorProps {
  progress: number;
  completedTodos: number;
  totalTodos: number;
}

export function ProgressIndicator({ progress, completedTodos, totalTodos }: ProgressIndicatorProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Progress</span>
        <span>{completedTodos}/{totalTodos} ({progress}%)</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-500 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}