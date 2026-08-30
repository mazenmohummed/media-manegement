// components/tasks/TaskExpensesManager.tsx
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Link2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Search,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PlannedExpense {
  id: string;
  itemName: string;
}

interface Vendor {
  id: string;
  name: string;
}

export interface TaskExpenseItem {
  id: string;
  itemName: string;
  cost: number;
  category: string;
  status: string;
  description: string | null;
  reimbursable: boolean;
  incurredAt: string | null;
  receiptUrl: string | null;
  plannedExpenseId: string | null;
  vendorId?: string | null;
  plannedExpense?: PlannedExpense | null;
  vendor?: Vendor | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskExpensesManagerProps<T = any> {
  taskId: string;
  initialExpenses: T[];
  onUpdate?: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'TALENT', label: 'Talent' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'PERMITS', label: 'Permits' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REIMBURSED', label: 'Reimbursed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-950/40 text-amber-400 border-amber-800',
  APPROVED: 'bg-emerald-950/40 text-emerald-400 border-emerald-800',
  REIMBURSED: 'bg-blue-950/40 text-blue-400 border-blue-800',
  REJECTED: 'bg-red-950/40 text-red-400 border-red-800',
};

export function TaskExpensesManager({ taskId, initialExpenses, onUpdate }: TaskExpensesManagerProps) {
  const [expenses, setExpenses] = useState<TaskExpenseItem[]>(initialExpenses);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [itemName, setItemName] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('EQUIPMENT');
  const [description, setDescription] = useState('');
  const [reimbursable, setReimbursable] = useState(false);
  const [incurredAt, setIncurredAt] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [plannedExpenseId, setPlannedExpenseId] = useState('');
  const [vendorId, setVendorId] = useState('');

  // Search state for vendors
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [searchingVendors, setSearchingVendors] = useState(false);

  // Planned expenses for linking
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [loadingPlanned, setLoadingPlanned] = useState(false);

  const fetchPlannedExpenses = useCallback(async () => {
    setLoadingPlanned(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/planned-expenses`);
      if (res.ok) {
        const data = await res.json();
        setPlannedExpenses(data.plannedExpenses || []);
      }
    } catch (err) {
      console.error('Failed to fetch planned expenses:', err);
    } finally {
      setLoadingPlanned(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchPlannedExpenses();
  }, [fetchPlannedExpenses]);

  const searchVendors = async (query: string) => {
    if (!query.trim()) {
      setVendors([]);
      return;
    }
    setSearchingVendors(true);
    try {
      const res = await fetch(`/api/vendors?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to search vendors:', err);
    } finally {
      setSearchingVendors(false);
    }
  };

  const handleVendorSearch = (value: string) => {
    setVendorSearch(value);
    searchVendors(value);
    setShowVendorDropdown(true);
  };

  const selectVendor = (vendor: Vendor) => {
    setVendorId(vendor.id);
    setVendorSearch(vendor.name);
    setShowVendorDropdown(false);
  };

  const computedTotals = useMemo(() => {
    const total = expenses.reduce((acc, item) => acc + (item.cost || 0), 0);
    const approved = expenses
      .filter((item) => item.status === 'APPROVED' || item.status === 'REIMBURSED')
      .reduce((acc, item) => acc + (item.cost || 0), 0);
    const pending = expenses
      .filter((item) => item.status === 'PENDING')
      .reduce((acc, item) => acc + (item.cost || 0), 0);
    const reimbursed = expenses
      .filter((item) => item.status === 'REIMBURSED')
      .reduce((acc, item) => acc + (item.cost || 0), 0);
    const reimbursableTotal = expenses
      .filter((item) => item.reimbursable)
      .reduce((acc, item) => acc + (item.cost || 0), 0);

    return { total, approved, pending, reimbursed, reimbursableTotal };
  }, [expenses]);

  const resetForm = () => {
    setEditingId(null);
    setItemName('');
    setCost('');
    setCategory('EQUIPMENT');
    setDescription('');
    setReimbursable(false);
    setIncurredAt('');
    setReceiptUrl('');
    setStatus('PENDING');
    setPlannedExpenseId('');
    setVendorId('');
    setVendorSearch('');
    setError(null);
    setSuccess(null);
  };

  const startEdit = (item: TaskExpenseItem) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setCost(item.cost.toString());
    setCategory(item.category);
    setDescription(item.description || '');
    setReimbursable(item.reimbursable);
    setIncurredAt(item.incurredAt ? new Date(item.incurredAt).toISOString().slice(0, 16) : '');
    setReceiptUrl(item.receiptUrl || '');
    setStatus(item.status);
    setPlannedExpenseId(item.plannedExpenseId || '');
    setVendorId(item.vendorId || '');
    setVendorSearch(item.vendor?.name || '');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }

    if (!cost || parseFloat(cost) <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      itemName: itemName.trim(),
      cost: parseFloat(cost),
      category,
      description: description.trim() || null,
      reimbursable,
      incurredAt: incurredAt ? new Date(incurredAt).toISOString() : null,
      receiptUrl: receiptUrl.trim() || null,
      status,
      plannedExpenseId: plannedExpenseId || null,
      vendorId: vendorId || null,
    };

    try {
      const url = editingId
        ? `/api/tasks/${taskId}/task-expenses/${editingId}`
        : `/api/tasks/${taskId}/task-expenses`;
      
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      if (editingId) {
        setExpenses(expenses.map((ex) => (ex.id === editingId ? data.expense : ex)));
        setSuccess('Expense updated successfully!');
      } else {
        setExpenses([data.expense, ...expenses]);
        setSuccess('Expense added successfully!');
      }

      if (onUpdate) onUpdate();
      resetForm();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/task-expenses/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete expense');
      }

      setExpenses(expenses.filter((ex) => ex.id !== id));
      setSuccess('Expense deleted successfully!');
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with totals */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-100">Task Expenses</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-3 py-1.5">
            <span className="text-zinc-500">Total:</span>
            <span className="font-bold text-purple-400">{formatCurrency(computedTotals.total)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
            <span className="text-emerald-400">Approved:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(computedTotals.approved)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
            <span className="text-amber-400">Pending:</span>
            <span className="font-bold text-amber-400">{formatCurrency(computedTotals.pending)}</span>
          </div>
          {computedTotals.reimbursableTotal > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
              <span className="text-blue-400">Reimbursable:</span>
              <span className="font-bold text-blue-400">{formatCurrency(computedTotals.reimbursableTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Item Name *</label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Expense title..."
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Cost *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-3"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Incurred Date</label>
            <Input
              type="datetime-local"
              value={incurredAt}
              onChange={(e) => setIncurredAt(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Receipt URL</label>
            <Input
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-3"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Vendor</label>
            <div className="relative">
              <Input
                value={vendorSearch}
                onChange={(e) => handleVendorSearch(e.target.value)}
                onFocus={() => setShowVendorDropdown(true)}
                placeholder="Search vendor..."
                className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
              />
              {showVendorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md max-h-40 overflow-y-auto z-10">
                  {searchingVendors ? (
                    <div className="p-2 text-center text-xs text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching...
                    </div>
                  ) : vendors.length > 0 ? (
                    vendors.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectVendor(v)}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <Building2 className="w-3 h-3 text-zinc-500" />
                        {v.name}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs text-zinc-500">No vendors found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Link Planned Expense</label>
            <select
              value={plannedExpenseId}
              onChange={(e) => setPlannedExpenseId(e.target.value)}
              className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-3"
            >
              <option value="">None</option>
              {plannedExpenses.map((pe) => (
                <option key={pe.id} value={pe.id}>
                  {pe.itemName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reimbursable}
                onChange={(e) => setReimbursable(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-purple-500"
              />
              Reimbursable
            </label>
          </div>
        </div>

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

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400 text-xs">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : editingId ? (
              <Save className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            {loading ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
          </Button>
        </div>
      </form>

      {/* Expense List */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No actual task expenses added yet.
          </div>
        ) : (
          expenses.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800/80 px-4 py-3 rounded-lg text-xs hover:border-zinc-700 transition-colors">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-semibold text-zinc-200">{item.itemName}</span>
                  <Badge className={`${getStatusBadge(item.status)} text-[10px] px-1.5 py-0`}>
                    {item.status}
                  </Badge>
                  {item.reimbursable && (
                    <Badge className="bg-blue-950/40 text-blue-400 border-blue-800 text-[10px] px-1.5 py-0">
                      Reimbursable
                    </Badge>
                  )}
                  {item.plannedExpense && (
                    <Badge className="bg-purple-950/40 text-purple-400 border-purple-800 text-[10px] px-1.5 py-0">
                      <Link2 className="w-2.5 h-2.5 mr-0.5" />
                      {item.plannedExpense.itemName}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                  <span>Category: {item.category}</span>
                  {item.incurredAt && (
                    <span>Date: {formatDate(item.incurredAt)}</span>
                  )}
                  {item.vendor && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {item.vendor.name}
                    </span>
                  )}
                  {item.description && (
                    <span className="text-zinc-400">"{item.description}"</span>
                  )}
                </div>
                {item.receiptUrl && (
                  <a 
                    href={item.receiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-[11px] inline-flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" /> View Receipt
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-emerald-400 text-sm">
                  {formatCurrency(item.cost)}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => startEdit(item)} 
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                    disabled={loading}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(item.id)} 
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    disabled={loading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}