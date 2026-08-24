'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { FileText, Building, ExternalLink, Search, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch('/api/invoices'); // Adjust to match your backend route if necessary (or keep your server fetch setup)
        const data = await res.json();
        if (Array.isArray(data)) setInvoices(data);
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  // Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client?.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Extract unique statuses dynamically for the status filter dropdown
  const uniqueStatuses = Array.from(new Set(invoices.map(inv => inv.status))).filter(Boolean);

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6 text-zinc-400">Loading invoices...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Invoices</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage billing, track balances, and issue invoices to clients.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by invoice # or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-800/60 px-3 py-2 rounded-lg border border-zinc-700/50 transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices List Table / Card Container */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Invoices Found ({filteredInvoices.length} of {invoices.length})
          </h3>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {filteredInvoices.map((inv) => (
              <div 
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/dashboard/finance/invoices/${inv.id}`}
                      className="font-mono font-semibold text-emerald-400 hover:underline text-sm inline-flex items-center gap-1"
                    >
                      {inv.invoiceNo}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[10px]">
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-zinc-500" />
                    {inv.client?.clientName || "Unknown Client"}
                    {inv.project && (
                      <span className="text-zinc-500">
                        • Project: {inv.project.projectName || inv.project.name}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Due Date</span>
                    <span className="text-zinc-300 font-medium">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "No deadline"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block">Balance Due</span>
                    <span className="text-zinc-100 font-bold text-sm">
                      {inv.currency} {inv.balanceDue?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-400">No matching invoices found.</p>
            <p className="text-xs text-zinc-500">
              Try adjusting your search criteria or filter options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}