// components/tasks/TaskWorkSession.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Play, Square, Clock, User, Calendar, 
  DollarSign, Loader2, AlertCircle, CheckCircle2,
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WorkSession {
  id: string;
  startTime: string;
  endTime: string | null;
  totalDuration: number | null;
  sessionType: string;
  isBillable: boolean;
  hourlyRate: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  task: {
    id: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TaskWorkSessionProps {
  taskId: string;
  userId: string;
  onUpdate?: () => void;
}

export function TaskWorkSession({ taskId, userId, onUpdate }: TaskWorkSessionProps) {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: '0.00',
    totalCost: '0.00',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/work-session?limit=100`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
        setStats({
          totalSessions: data.stats.totalSessions,
          totalHours: data.stats.totalHours,
          totalCost: data.stats.totalCost,
        });
        setActiveSession(data.stats.activeSession || null);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load work sessions');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const startSession = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/work-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      setSuccess('Work session started!');
      await fetchSessions();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/work-session`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end session');
      }

      setSuccess(`Session ended! Total: ${data.totalDuration} hours`);
      await fetchSessions();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to end session');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get the last 3 sessions (excluding active session if it exists)
  const getDisplaySessions = () => {
    // Filter out active session (it's shown separately)
    const completedSessions = sessions.filter(s => s.endTime !== null);
    
    // Sort by startTime descending (newest first)
    const sorted = [...completedSessions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    if (showAllSessions) {
      return sorted;
    }
    
    // Return only last 3 completed sessions
    return sorted.slice(0, 3);
  };

  const displaySessions = getDisplaySessions();
  const hasMoreSessions = sessions.filter(s => s.endTime !== null).length > 3;

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Work Sessions</h3>
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
            {sessions.filter(s => s.endTime !== null).length} total
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
          {activeSession ? (
            <Button
              onClick={endSession}
              disabled={actionLoading}
              size="sm"
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="ml-1.5">End Session</span>
            </Button>
          ) : (
            <Button
              onClick={startSession}
              disabled={actionLoading}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="ml-1.5">Start Session</span>
            </Button>
          )}

      {/* Active Session Indicator */}
      {activeSession && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Active Session</p>
                <p className="text-xs text-zinc-400">
                  Started at {formatTime(activeSession.startTime)}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">
              In Progress
            </Badge>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sessions</p>
          <p className="text-lg font-bold text-zinc-200">{stats.totalSessions}</p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Hours</p>
          <p className="text-lg font-bold text-zinc-200">{stats.totalHours}h</p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Cost</p>
          <p className="text-lg font-bold text-emerald-400">${stats.totalCost}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Session List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {displaySessions.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            No completed work sessions recorded yet.
          </p>
        ) : (
          <>
            {displaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-zinc-950/40 border-zinc-800/60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {session.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                    <span>{formatDate(session.startTime)}</span>
                    <span>•</span>
                    <span>{formatTime(session.startTime)}</span>
                    {session.endTime && (
                      <>
                        <span>→</span>
                        <span>{formatTime(session.endTime)}</span>
                      </>
                    )}
                    {session.totalDuration && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-zinc-400">
                          {session.totalDuration.toFixed(1)}h
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {session.hourlyRate && session.totalDuration && (
                    <p className="text-xs font-semibold text-emerald-400">
                      ${(session.totalDuration * session.hourlyRate).toFixed(2)}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600">
                    {session.sessionType}
                  </p>
                </div>
              </div>
            ))}

            {/* Show More/Less Button */}
            {hasMoreSessions && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                {showAllSessions ? (
                  <span className="flex items-center justify-center gap-1">
                    <ChevronUp className="w-3 h-3" />
                    Show Less
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <ChevronDown className="w-3 h-3" />
                    Show All Sessions ({sessions.filter(s => s.endTime !== null).length})
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}