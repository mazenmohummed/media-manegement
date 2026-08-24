'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, DollarSign, Calendar, FileText, CheckSquare, Square } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [clientId, setClientId] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [method, setMethod] = useState('CASH');
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [nextReferenceNo, setNextReferenceNo] = useState('1');

  // Multi-invoice allocation state: Map of invoiceId -> allocatedAmount (number)
  const [selectedInvoicesMap, setSelectedInvoicesMap] = useState<Record<string, number>>({});

  // Search/Filter states for creation form
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false); // Modal or expandable section for multi-invoice selection

  // Table Filter & Search states
  const [tableSearch, setTableSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const session = await res.json();
          if (session?.agencyId) {
            setAgencyId(session.agencyId);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (agencyId) {
      fetchPayments();
      fetchClientsAndInvoices();
    }
  }, [agencyId]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/payments?agencyId=${agencyId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsAndInvoices = async () => {
    try {
      const res = await fetch(`/api/payments/meta?agencyId=${agencyId}`);
      const data = await res.json();
      if (data.clients) setClients(data.clients);
      if (data.invoices) setInvoices(data.invoices);
      if (data.nextReferenceNo) setNextReferenceNo(data.nextReferenceNo);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(amount);

      // Map selected invoices map into the array format required by backend
      const allocations = Object.entries(selectedInvoicesMap)
        .filter(([_, allocAmount]) => allocAmount > 0)
        .map(([invoiceId, allocAmount]) => ({
          invoiceId,
          amount: allocAmount,
        }));

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          clientId,
          amount: parsedAmount,
          method,
          datePaid,
          referenceNo: nextReferenceNo,
          allocations,
        }),
      });

      if (res.ok) {
        setAmount('');
        setClientId('');
        setSelectedInvoicesMap({});
        setClientSearch('');
        fetchPayments();
        fetchClientsAndInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleInvoiceSelection = (invoice: any) => {
    const exists = selectedInvoicesMap[invoice.id] !== undefined;
    if (exists) {
      const updated = { ...selectedInvoicesMap };
      delete updated[invoice.id];
      setSelectedInvoicesMap(updated);
    } else {
      // Default allocated amount is up to the full balance due or remaining pool
      setSelectedInvoicesMap({
        ...selectedInvoicesMap,
        [invoice.id]: invoice.balanceDue || 0,
      });
    }
  };

  const updateAllocationAmount = (invoiceId: string, val: string) => {
    const numeric = parseFloat(val) || 0;
    setSelectedInvoicesMap({
      ...selectedInvoicesMap,
      [invoiceId]: numeric,
    });
  };

  const filteredClients = clients.filter(c => 
    c.clientName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.clientNo && c.clientNo.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  // Filter available invoices matching chosen client context
  const availableInvoices = invoices.filter(inv => 
    clientId ? inv.clientId === clientId : true
  );

  const selectedClientObj = clients.find(c => c.id === clientId);

  // Table filtering logic
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.referenceNo?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      p.client?.clientName?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      p.id?.toLowerCase().includes(tableSearch.toLowerCase());
    
    const matchesMethod = methodFilter === 'ALL' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-zinc-900 dark:text-zinc-100">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Record client receipts and track invoice allocations.</p>
        </div>
        <div className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg">
          Next Reference: <span className="font-semibold text-emerald-600 dark:text-emerald-400">#{nextReferenceNo}</span>
        </div>
      </div>

      {/* Record Payment Form */}
      <form onSubmit={handleRecordPayment} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm space-y-4">
        <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">Record New Payment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Client Searchable Dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Client</label>
            <div 
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-2 text-sm cursor-pointer flex justify-between items-center"
            >
              <span className="truncate">{selectedClientObj ? selectedClientObj.clientName : 'Select client...'}</span>
              <span className="text-zinc-400 text-xs">▼</span>
            </div>

            {isClientDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-zinc-900 shadow-xl rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
                <input
                  type="text"
                  placeholder="Search client..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredClients.length === 0 ? (
                    <div className="p-2 text-xs text-zinc-500 text-center">No clients found</div>
                  ) : (
                    filteredClients.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClientId(c.id);
                          setIsClientDropdownOpen(false);
                          setClientSearch('');
                          setSelectedInvoicesMap({}); // Reset invoices when client changes
                        }}
                        className="p-2 hover:bg-emerald-50 dark:hover:bg-zinc-800 cursor-pointer rounded text-sm flex justify-between items-center transition-colors"
                      >
                        <span>{c.clientName}</span>
                        <span className="text-zinc-400 font-mono text-xs">{c.clientNo}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Payment Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="STRIPE">Stripe</option>
              <option value="CHECK">Check</option>
            </select>
          </div>

          {/* Date Paid */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Date Paid</label>
            <input
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Multi-Invoice Allocation Selector Section */}
          <div className="md:col-span-3 space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Allocate to Invoices {clientId ? '(Filtered by selected client)' : '(Select client to refine)'}
              </label>
              <span className="text-xs text-zinc-400">
                {Object.keys(selectedInvoicesMap).length} invoice(s) selected
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-52 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
              {availableInvoices.length === 0 ? (
                <div className="p-4 text-xs text-zinc-500 text-center">No open invoices available for allocation.</div>
              ) : (
                availableInvoices.map(inv => {
                  const isSelected = selectedInvoicesMap[inv.id] !== undefined;
                  return (
                    <div key={inv.id} className="p-3 flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleInvoiceSelection(inv)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                        <div>
                          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{inv.invoiceNo}</span>
                          <span className="text-xs text-zinc-400 block">Due: {inv.currency} {inv.balanceDue}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Apply:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={selectedInvoicesMap[inv.id]}
                            onChange={(e) => updateAllocationAmount(inv.id, e.target.value)}
                            className="w-28 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Record Payment (#{nextReferenceNo})
          </button>
        </div>
      </form>

      {/* Filter Bar & Table Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden space-y-4">
        
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ref # or client..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
              >
                <option value="ALL">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="STRIPE">Stripe</option>
                <option value="CHECK">Check</option>
              </select>
            </div>

            {(tableSearch || methodFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setTableSearch('');
                  setMethodFilter('ALL');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Payments List Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Ref No.</th>
                <th className="px-6 py-3 text-left">Client</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-400">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-400">No matching payments recorded.</td></tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      <a href={`payments/${p.id}`} className="hover:underline">#{p.referenceNo || p.id.slice(-8)}</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{p.client?.clientName || 'Unknown Client'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-900 dark:text-zinc-100">{p.amount} {p.currency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 text-xs">
                      <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono">
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 text-xs">{new Date(p.datePaid).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}