'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Eye, Trash2, ArrowLeft, FileText, Search, Calendar, X } from 'lucide-react';

type PurchaseOrder = {
  id: string;
  poNo: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  expectedDeliveryDate: string | null;
  createdAt: string;
  vendor: {
    name: string;
  };
  project?: {
    name: string;
  } | null;
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeAgencyId = searchParams.get('agencyId') || '';
  const initialSearch = searchParams.get('search') || '';

  const [agencyId, setAgencyId] = useState(routeAgencyId);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Custom Date Range Filters (YYYY-MM-DD format)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function loadPurchaseOrders() {
      try {
        let activeAgencyId = agencyId;

        if (!activeAgencyId) {
          const sessionRes = await fetch('/api/session');
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            activeAgencyId = session.agencyId || '';
          }
        }

        if (!activeAgencyId) {
          setLoading(false);
          return;
        }

        setAgencyId(activeAgencyId);

        const res = await fetch(`/api/purchase-orders?agencyId=${activeAgencyId}`);
        if (!res.ok) throw new Error('Failed to fetch purchase orders');

        const data = await res.json();
        let poList = [];
        if (Array.isArray(data)) {
          poList = data;
        } else if (data && Array.isArray(data.purchaseOrders)) {
          poList = data.purchaseOrders;
        } else if (data && Array.isArray(data.data)) {
          poList = data.data;
        }

        setPurchaseOrders(poList);
      } catch (err) {
        console.error('Failed to load purchase orders', err);
      } finally {
        setLoading(false);
      }
    }

    loadPurchaseOrders();
  }, [agencyId]);

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      (po.poNo && po.poNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (po.vendor?.name && po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (po.project?.name && po.project.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;

    // Custom Date Range Filtering (From / To) based on createdAt
    let matchesDate = true;
    if (po.createdAt) {
      // Normalize PO date to YYYY-MM-DD for reliable comparison
      const poDateStr = new Date(po.createdAt).toISOString().split('T')[0];

      if (dateFrom && poDateStr < dateFrom) {
        matchesDate = false;
      }
      if (dateTo && poDateStr > dateTo) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-muted text-muted-foreground';
      case 'ORDERED':
        return 'bg-blue-600/10 text-blue-600';
      case 'DELIVERED':
        return 'bg-emerald-600/10 text-emerald-600';
      case 'CANCELLED':
        return 'bg-red-600/10 text-red-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Purchase Orders</h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Manage procurement orders, track deliveries, and handle supplier expenses.
          </p>
        </div>
        <Link
          href={agencyId ? `/dashboard/purchase-orders/new?agencyId=${agencyId}` : '/dashboard/purchase-orders/new'}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 shadow-lg transition-colors"
        >
          <Plus size={16} /> Create Purchase Order
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4 bg-background border border-border rounded-3xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by PO, vendor, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* From / To Date Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Calendar size={14} /> From:
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground ml-1">
              To:
            </div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={clearDateFilter}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                title="Clear Date Filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pt-2 border-t border-border">
          <span className="text-xs font-bold text-muted-foreground px-2">Status:</span>
          {['ALL', 'DRAFT', 'ORDERED', 'DELIVERED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table / List */}
      <div className="bg-background border border-border rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Loading purchase orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText size={40} className="mx-auto text-muted-foreground/50" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              No purchase orders found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-bold">
                {filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-black text-foreground">
                      {po.poNo || 'Draft Order'}
                    </td>
                    <td className="p-4 text-foreground">{po.vendor?.name || 'Unknown Vendor'}</td>
                    <td className="p-4 text-muted-foreground">{po.project?.name || 'No Project'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Not Specified'}
                    </td>
                    <td className="p-4 text-right font-black text-foreground">
                      {po.currency} {Number(po.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/dashboard/vendors/purchase-orders/${po.id}`}
                        className="p-2 inline-flex items-center justify-center text-muted-foreground hover:text-blue-600 rounded-lg transition-colors"
                        title="View Purchase Order"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}