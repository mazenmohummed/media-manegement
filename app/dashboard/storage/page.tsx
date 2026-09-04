// app/agency/dashboard/storage/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  HardDrive, 
  Cloud, 
  FileText, 
  CheckCircle, 
  Archive, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// ✅ Define types for the metrics
interface StorageMetrics {
  local: {
    used: string;
    total: string;
  };
  cloud: {
    used: number;
    quota: number;
    percentage: number;
  };
  files: {
    active: number;
    archived: number;
    synced: number;
  };
}

interface SyncStatus {
  syncedCount: number;
  failedCount: number;
}

export default function StorageDashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [agencyId, setAgencyId] = useState<string>('');

  // Get agencyId from session
  useEffect(() => {
    if (session?.user?.agencyId) {
      setAgencyId(session.user.agencyId);
    }
  }, [session]);

  // Fetch storage metrics
  const fetchMetrics = async () => {
    if (!agencyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agency/storage/metrics?agencyId=${agencyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch storage metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual sync
  const handleSync = async () => {
    if (!agencyId || syncing) return;
    
    setSyncing(true);
    setSyncStatus(null);
    
    try {
      const response = await fetch('/api/agency/storage/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agencyId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync files');
      }
      
      const data = await response.json();
      setSyncStatus(data);
      
      // Refresh metrics after sync
      await fetchMetrics();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Fetch metrics on mount and when agencyId changes
  useEffect(() => {
    if (agencyId) {
      fetchMetrics();
    }
  }, [agencyId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400">Loading storage metrics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 border border-red-500/20 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No agency ID
  if (!agencyId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">No Agency Found</h2>
          <p className="text-slate-400">Please select an agency to view storage metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Storage Dashboard</h1>
          <p className="text-sm text-slate-400">Monitor your agency's storage usage and file sync status</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
            syncing 
              ? 'bg-slate-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          syncStatus.failedCount > 0 
            ? 'bg-amber-500/10 border border-amber-500/20' 
            : 'bg-emerald-500/10 border border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {syncStatus.failedCount > 0 ? (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-sm text-slate-300">
              Sync completed: {syncStatus.syncedCount} files synced
              {syncStatus.failedCount > 0 && (
                <span className="text-amber-400 ml-2">
                  ({syncStatus.failedCount} failed)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Local Storage Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-400">Local Storage</h3>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {metrics?.local.used || '0 B'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total: {metrics?.local.total || 'UNLIMITED'}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-400">
              ✅ Files stored on your local server (no cost)
            </p>
          </div>
        </div>

        {/* Cloud Storage Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-400">Cloud Storage</h3>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {metrics?.cloud.used?.toFixed(2) || '0'} GB
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Quota: {metrics?.cloud.quota?.toFixed(2) || '0'} GB
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Cloud className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Usage</span>
              <span>{metrics?.cloud.percentage?.toFixed(1) || 0}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  (metrics?.cloud.percentage || 0) > 90 
                    ? 'bg-red-500' 
                    : (metrics?.cloud.percentage || 0) > 70 
                    ? 'bg-amber-500' 
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(metrics?.cloud.percentage || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Files Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-400">Files</h3>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {metrics?.files.active || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Active files
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Archived: {metrics?.files.archived || 0}</span>
              <span>Synced: {metrics?.files.synced || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Storage Strategy</h4>
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Local files are stored on your agency's server</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Active files are synced to cloud for client sharing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Old projects are archived to save cloud costs</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="w-full text-left px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : '🔄 Sync files to cloud'}
            </button>
            <button 
              onClick={fetchMetrics}
              className="w-full text-left px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors"
            >
              📊 Refresh metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}