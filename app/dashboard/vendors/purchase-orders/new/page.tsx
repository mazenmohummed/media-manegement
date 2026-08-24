'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Search, X } from 'lucide-react';

type ItemRow = {
  description: string;
  quantity: number;
  unitCost: number;
};

type Quotation = {
  id: string;
  quotationNo?: string;
  description?: string;
  amount?: number;
  currency?: string;
  vendorId?: string;
  projectId?: string;
  notes?: string;
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationIdParam = searchParams.get('quotationId');
  const routeVendorId = searchParams.get('vendorId');

  const [vendors, setVendors] = useState<{ id: string; name: string; agencyId: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [quotationId, setQuotationId] = useState(quotationIdParam || '');
  const [quotationSearch, setQuotationSearch] = useState('');
  const [isQuotationDropdownOpen, setIsQuotationDropdownOpen] = useState(false);

  const [vendorId, setVendorId] = useState(routeVendorId || '');
  const [agencyId, setAgencyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  
  // Set default notes and items to empty
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  // Helper to load quotation details and pre-populate the form
  const applyQuotationDetails = (quot: Quotation) => {
    setQuotationId(quot.id);
    if (quot.vendorId) setVendorId(quot.vendorId);
    if (quot.projectId) setProjectId(quot.projectId);
    if (quot.currency) setCurrency(quot.currency);
    if (quot.notes) setNotes(quot.notes);
    if (quot.amount != null) {
      setItems([{ description: quot.description || 'Quotation amount', quantity: 1, unitCost: quot.amount }]);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const urlAgencyId = searchParams.get('agencyId') || '';
        let activeAgencyId = agencyId || urlAgencyId;

        if (!activeAgencyId) {
          const sessionRes = await fetch('/api/session');
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            activeAgencyId = session.agencyId || '';
          }
        }

        if (!activeAgencyId) return;
        setAgencyId(activeAgencyId);

        const [vendorsRes, projectsRes, quotationsRes] = await Promise.all([
          fetch(`/api/vendors?agencyId=${activeAgencyId}`),
          fetch(`/api/projects?agencyId=${activeAgencyId}`),
          fetch(`/api/quotations?agencyId=${activeAgencyId}`),
        ]);

        const vendorData = await vendorsRes.json();
        let vendorList = Array.isArray(vendorData) ? vendorData : vendorData?.vendors || vendorData?.data || [];

        const projectData = await projectsRes.json();
        let projectList = Array.isArray(projectData) ? projectData : projectData?.projects || projectData?.data || [];

        const quotationData = await quotationsRes.json();
        let quotationList = Array.isArray(quotationData) ? quotationData : quotationData?.quotations || quotationData?.data || [];

        setVendors(vendorList);
        setProjects(projectList);
        setQuotations(quotationList);

        const targetQId = quotationIdParam || quotationId;
        if (targetQId) {
          const matchedQuot = quotationList.find((q: Quotation) => q.id === targetQId);
          if (matchedQuot) {
            applyQuotationDetails(matchedQuot);
          } else {
            const quotRes = await fetch(`/api/quotations/${targetQId}`);
            if (quotRes.ok) {
              const quot = await quotRes.json();
              applyQuotationDetails(quot);
            }
          }
        }

        if (routeVendorId && vendorList.length > 0) {
          setVendorId(routeVendorId);
          const matched = vendorList.find((v: any) => v.id === routeVendorId);
          if (matched && matched.agencyId) {
            setAgencyId(matched.agencyId);
          }
        }
      } catch (err) {
        console.error('Failed to load initial purchase order form data', err);
      }
    }

    loadData();
  }, [quotationIdParam, routeVendorId, agencyId, searchParams]);

  const handleVendorChange = (selectedVendorId: string) => {
    setVendorId(selectedVendorId);
    const found = vendors.find((v) => v.id === selectedVendorId);
    if (found) {
      setAgencyId(found.agencyId);
    }
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  };

  const filteredQuotations = quotations.filter((q) => {
    const query = quotationSearch.toLowerCase();
    const qNo = (q.quotationNo || '').toLowerCase();
    const desc = (q.description || '').toLowerCase();
    return qNo.includes(query) || desc.includes(query) || q.id.toLowerCase().includes(query);
  });

  const selectedQuotationObj = quotations.find((q) => q.id === quotationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !agencyId) {
      alert('Please select a valid vendor.');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one order item.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          agencyId,
          projectId: projectId || null,
          quotationId: quotationId || null,
          currency,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
          notes,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitCost: Number(i.unitCost) || 0,
            total: (Number(i.quantity) || 1) * (Number(i.unitCost) || 0),
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create purchase order');

      router.push(`/dashboard/vendors/${vendorId}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Create Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-background border border-border rounded-3xl p-6 space-y-6 shadow-sm">
        
        {/* Quotation Search & Select Field */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
            Link Quotation <span className="normal-case font-medium text-muted-foreground/70">(optional)</span>
          </label>
          <div className="relative">
            {selectedQuotationObj ? (
              <div className="flex items-center justify-between w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground">
                <span>
                  {selectedQuotationObj.quotationNo || `Quotation #${selectedQuotationObj.id.slice(0, 8)}`} - {selectedQuotationObj.currency} {selectedQuotationObj.amount}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQuotationId('');
                    setQuotationSearch('');
                  }}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search quotations by number or description..."
                    value={quotationSearch}
                    onChange={(e) => {
                      setQuotationSearch(e.target.value);
                      setIsQuotationDropdownOpen(true);
                    }}
                    onFocus={() => setIsQuotationDropdownOpen(true)}
                    className="w-full bg-background border border-border rounded-2xl pl-9 pr-3 py-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  />
                </div>

                {isQuotationDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredQuotations.length > 0 ? (
                      filteredQuotations.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => {
                            applyQuotationDetails(q);
                            setIsQuotationDropdownOpen(false);
                            setQuotationSearch('');
                          }}
                          className="p-3 text-xs font-bold text-foreground hover:bg-muted/50 cursor-pointer border-b border-border last:border-none"
                        >
                          <div className="text-foreground">{q.quotationNo || `Quotation #${q.id.slice(0, 8)}`}</div>
                          <div className="text-muted-foreground font-normal text-[10px]">
                            {q.description ? `${q.description.slice(0, 50)}...` : 'No description'} — {q.currency} {q.amount ?? 0}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground text-center">No quotations found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
              required
            >
              <option value="">Select Vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
              Project <span className="normal-case font-medium text-muted-foreground/70">(optional)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground uppercase focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Expected Delivery</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Items Section */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Order Items</label>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600/20 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
                No items added yet. Click &quot;Add Item&quot; to begin.
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-3 rounded-2xl">
                  <input
                    type="text"
                    placeholder="Item description or service..."
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="col-span-6 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Unit Cost"
                    step="0.01"
                    min="0"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                    className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                    required
                  />
                  <div className="col-span-1 text-right text-xs font-black text-foreground">
                    {((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)).toFixed(2)}
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <p className="text-xs font-black uppercase tracking-wider text-foreground">
              Total Amount: <span className="text-blue-600">{currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
            rows={3}
            placeholder="Add internal notes or instructions..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-border text-foreground text-xs font-bold uppercase rounded-xl hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Save Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
}