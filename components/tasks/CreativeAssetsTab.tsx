// components/tasks/CreativeAssetsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Film, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionTaskDetail } from '@/components/production/ProductionTaskDetail';
import toast from 'react-hot-toast';

interface CreativeAssetsTabProps {
  taskId: string;
  onUpdate?: () => void;
}

export function CreativeAssetsTab({ taskId, onUpdate }: CreativeAssetsTabProps) {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Film className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
        <p>Task not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Production Assets</h3>
          <p className="text-xs text-zinc-400">
            Track all creative assets attached to this task
          </p>
        </div>
      </div>

      <ProductionTaskDetail
        taskId={taskId}
        projectId={task.projectId}
        task={task}
        onAssetAttached={() => {
          if (onUpdate) onUpdate();
        }}
      />
    </div>
  );
}