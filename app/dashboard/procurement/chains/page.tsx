'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  FileText,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProcurementChain {
  taskId: string;
  taskTitle: string | null;
  taskType: string;
  plannedExpenses: {
    id: string;
    status: string;
    totalEstimated: number;
  }[];
  quotations: {
    id: string;
    status: string;
    amount: number | null;
    quotationNo: string | null;
    vendorName: string | null;
  }[];
  plannedOrders: {
    id: string;
    status: string;
    totalAmount: number;
    plannedPoNo: string | null;
  }[];
  purchaseOrders: {
    id: string;
    status: string;
    totalAmount: number;
    poNo: string | null;
    vendorName: string | null;
  }[];
}

interface ChainStatus {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

export default function ProcurementChainsPage() {
  const router = useRouter();
  const [chains, setChains] = useState<ProcurementChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChains();
  }, []);

  const fetchChains = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/procurement/chains');
      if (!response.ok) throw new Error('Failed to fetch procurement chains');
      const data = await response.json();
      setChains(data);
    } catch (error) {
      console.error('Error fetching chains:', error);
      toast.error('Failed to load procurement chains');
    } finally {
      setLoading(false);
    }
  };

  const toggleChain = (taskId: string) => {
    const newExpanded = new Set(expandedChains);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedChains(newExpanded);
  };

  const getChainStatus = (chain: ProcurementChain): ChainStatus => {
    // Check if there are any pending approvals
    const hasPendingPlanned = chain.plannedExpenses.some(e => e.status === 'DRAFT');
    const hasPendingQuotations = chain.quotations.some(q => q.status === 'REQUESTED' || q.status === 'RECEIVED');
    const hasPendingPlannedOrders = chain.plannedOrders.some(po => po.status === 'PLANNED');
    const hasPendingPOs = chain.purchaseOrders.some(po => po.status === 'DRAFT' || po.status === 'SENT');
    
    // Check if complete
    const hasDeliveredPOs = chain.purchaseOrders.some(po => po.status === 'DELIVERED' || po.status === 'INVOICED');
    const allExpensesApproved = chain.plannedExpenses.every(e => e.status === 'APPROVED' || e.status === 'CONVERTED');
    const allQuotationsProcessed = chain.quotations.every(q => q.status === 'SELECTED' || q.status === 'REJECTED' || q.status === 'EXPIRED');
    const allOrdersComplete = chain.purchaseOrders.every(po => po.status === 'DELIVERED' || po.status === 'INVOICED' || po.status === 'CANCELLED');

    // Determine status
    if (chain.plannedExpenses.length === 0 && chain.quotations.length === 0) {
      return { label: 'Not Started', color: 'text-zinc-400', bg: 'bg-zinc-800/50 border-zinc-700', icon: <Clock className="w-4 h-4" /> };
    }

    if (hasPendingPlanned) {
      return { label: 'Planning', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: <ClipboardList className="w-4 h-4" /> };
    }

    if (hasPendingQuotations) {
      return { label: 'Sourcing', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <FileText className="w-4 h-4" /> };
    }

    if (hasPendingPlannedOrders) {
      return { label: 'Pending Approval', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: <Clock className="w-4 h-4" /> };
    }

    if (hasPendingPOs) {
      return { label: 'Ordering', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: <Package className="w-4 h-4" /> };
    }

    if (hasDeliveredPOs && allOrdersComplete) {
      return { label: 'Complete', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle className="w-4 h-4" /> };
    }

    if (chain.purchaseOrders.some(po => po.status === 'CANCELLED')) {
      return { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: <XCircle className="w-4 h-4" /> };
    }

    return { label: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: <Clock className="w-4 h-4" /> };
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      // Planned Expenses
      DRAFT: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Draft' },
      APPROVED: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Approved' },
      REJECTED: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Rejected' },
      CONVERTED: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Converted' },
      // Quotations
      REQUESTED: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Requested' },
      RECEIVED: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Received' },
      COMPARED: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Compared' },
      SELECTED: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Selected' },
      EXPIRED: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Expired' },
      // Planned Orders
      PLANNED: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Planned' },
      // Purchase Orders
      SENT: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Sent' },
      CONFIRMED: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Confirmed' },
      DELIVERED: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Delivered' },
      CANCELLED: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Cancelled' },
      INVOICED: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Invoiced' },
    };
    return map[status] || { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: status };
  };

  // Filter chains
  const filteredChains = chains.filter(chain => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        chain.taskTitle?.toLowerCase().includes(searchLower) ||
        chain.taskType.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      const status = getChainStatus(chain);
      if (status.label.toLowerCase() !== filterStatus.toLowerCase()) return false;
    }

    return true;
  });

  // Unique statuses for filter
  const statusOptions = ['all', 'planning', 'sourcing', 'pending approval', 'ordering', 'complete', 'cancelled', 'in progress'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading procurement chains...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/procurement"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Procurement Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Procurement Chains</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Track the complete procurement lifecycle for each task
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchChains}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
            {filteredChains.length} chains
          </span>
        </div>
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by task name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Chains List ──────────────────────────────────────────────────────── */}
      {filteredChains.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
          <ClipboardList className="mx-auto h-12 w-12 text-zinc-600" />
          <h3 className="mt-3 text-sm font-medium text-zinc-300">No procurement chains found</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Create planned expenses or quotations to start a procurement chain'}
          </p>
          {(searchTerm || filterStatus !== 'all') && (
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChains.map((chain) => {
            const status = getChainStatus(chain);
            const isExpanded = expandedChains.has(chain.taskId);
            const totalBudget = chain.plannedExpenses.reduce((sum, e) => sum + e.totalEstimated, 0);
            const totalQuoted = chain.quotations.reduce((sum, q) => sum + (q.amount || 0), 0);
            const totalOrdered = chain.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);

            return (
              <div
                key={chain.taskId}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Chain Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => toggleChain(chain.taskId)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Badge className={`${status.bg} border font-mono ${status.color}`}>
                      <span className="flex items-center gap-1.5">
                        {status.icon}
                        {status.label}
                      </span>
                    </Badge>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                        {chain.taskTitle || `Task ${chain.taskId.slice(0, 8)}`}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {chain.taskType} • {chain.plannedExpenses.length} planned expenses • {chain.quotations.length} quotations • {chain.purchaseOrders.length} POs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        {totalBudget.toLocaleString()} budget
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-400" />
                        {totalQuoted.toLocaleString()} quoted
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Package className="w-3 h-3 text-purple-400" />
                        {totalOrdered.toLocaleString()} ordered
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/tasks/${chain.taskId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-5 space-y-6 bg-zinc-950/30">
                    {/* Flow Visualization */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 overflow-x-auto pb-2">
                      <span className="font-medium text-zinc-400">Flow:</span>
                      <span className="px-2 py-0.5 bg-zinc-800 rounded">Planned Expenses</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                      <span className="px-2 py-0.5 bg-zinc-800 rounded">Quotations</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                      <span className="px-2 py-0.5 bg-zinc-800 rounded">Planned Orders</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                      <span className="px-2 py-0.5 bg-zinc-800 rounded">Purchase Orders</span>
                    </div>

                    {/* Planned Expenses */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Planned Expenses ({chain.plannedExpenses.length})
                      </h4>
                      {chain.plannedExpenses.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No planned expenses</p>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.plannedExpenses.map((expense) => {
                            const badge = getStatusBadge(expense.status);
                            return (
                              <div key={expense.id} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded-lg px-3 py-2">
                                <span className="text-zinc-300">Expense Item</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400">{expense.totalEstimated.toLocaleString()}</span>
                                  <Badge className={badge.color}>{badge.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quotations */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Quotations ({chain.quotations.length})
                      </h4>
                      {chain.quotations.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No quotations</p>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.quotations.map((quotation) => {
                            const badge = getStatusBadge(quotation.status);
                            return (
                              <div key={quotation.id} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded-lg px-3 py-2">
                                <div>
                                  <span className="text-zinc-300">{quotation.quotationNo || 'Quotation'}</span>
                                  <span className="text-zinc-500 ml-2">{quotation.vendorName || 'No vendor'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400">{quotation.amount?.toLocaleString() || '0'}</span>
                                  <Badge className={badge.color}>{badge.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Planned Orders */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Planned Orders ({chain.plannedOrders.length})
                      </h4>
                      {chain.plannedOrders.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No planned orders</p>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.plannedOrders.map((order) => {
                            const badge = getStatusBadge(order.status);
                            return (
                              <div key={order.id} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded-lg px-3 py-2">
                                <span className="text-zinc-300">{order.plannedPoNo || 'Planned Order'}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400">{order.totalAmount.toLocaleString()}</span>
                                  <Badge className={badge.color}>{badge.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Purchase Orders */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        Purchase Orders ({chain.purchaseOrders.length})
                      </h4>
                      {chain.purchaseOrders.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No purchase orders</p>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.purchaseOrders.map((order) => {
                            const badge = getStatusBadge(order.status);
                            return (
                              <div key={order.id} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded-lg px-3 py-2">
                                <div>
                                  <span className="text-zinc-300">{order.poNo || 'Purchase Order'}</span>
                                  <span className="text-zinc-500 ml-2">{order.vendorName || 'No vendor'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400">{order.totalAmount.toLocaleString()}</span>
                                  <Badge className={badge.color}>{badge.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-800">
                      <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-zinc-500">Budget</p>
                        <p className="text-sm font-bold text-zinc-100">{totalBudget.toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-zinc-500">Quoted</p>
                        <p className="text-sm font-bold text-blue-400">{totalQuoted.toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-zinc-500">Ordered</p>
                        <p className="text-sm font-bold text-purple-400">{totalOrdered.toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-zinc-500">Status</p>
                        <p className={`text-sm font-bold ${status.color}`}>{status.label}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}