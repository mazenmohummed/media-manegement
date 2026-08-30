// components/tasks/QuickTaskStarter.tsx
'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickTaskStarterProps {
  taskId: string;
  taskTitle: string;
  onStart?: () => void;
}

export function QuickTaskStarter({ taskId, taskTitle, onStart }: QuickTaskStarterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startQuickSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/work-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      if (onStart) onStart();
      
      // Show success feedback
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50';
      toast.textContent = `Started work on "${taskTitle}"`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={startQuickSession}
        disabled={loading}
        size="sm"
        variant="outline"
        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        <span className="ml-1">Start</span>
      </Button>
      {error && (
        <span className="text-xs text-rose-500">{error}</span>
      )}
    </div>
  );
}