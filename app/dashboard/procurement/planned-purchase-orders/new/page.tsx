'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Search, X, Check } from 'lucide-react';

type ItemRow = {
  description: string;
  quantity: number;
  unitCost: number;
};

type Quotation = {
  id: string;
  quotationNo?: string;
  description?: string;
  plannedAmount?: number;
  amount?: number;
  currency?: string;
  vendorId?: string;
  projectId?: string;
  notes?: string;
};

export default function NewPlannedOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationIdParam = searchParams.get('quotationId');

  const [vendors, setVendors] = useState<{ id: string; name: string; agencyId: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [quotationId, setQuotationId] = useState(quotationIdParam || '');
  const [quotationSearch, setQuotationSearch] = useState('');
  const [isQuotationDropdownOpen, setIsQuotationDropdownOpen] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);

  const [agencyId, setAgencyId] = useState('');
  
  const [projectId, setProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [currency, setCurrency] = useState('EGP');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  
  // Initialized as empty
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  // Refs for clicking outside dropdowns
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const quotationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setIsVendorDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (quotationDropdownRef.current && !quotationDropdownRef.current.contains(event.target as Node)) {
        setIsQuotationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to load quotation details and pre-populate the form (excluding notes and items)
  const applyQuotationDetails = (quot: Quotation) => {
    setQuotationId(quot.id);
    if (quot.vendorId) setVendorId(quot.vendorId);
    if (quot.projectId) setProjectId(quot.projectId);
    if (quot.currency) setCurrency(quot.currency);
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
      } catch (err) {
        console.error('Failed to load initial planned purchase order form data', err);
      }
    }

    loadData();
  }, [quotationIdParam, agencyId, searchParams]);

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

  const filteredVendors = vendors.filter((v) => v.name.toLowerCase().includes(vendorSearch.toLowerCase()));
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()));

  const selectedQuotationObj = quotations.find((q) => q.id === quotationId);
  const selectedVendorObj = vendors.find((v) => v.id === vendorId);
  const selectedProjectObj = projects.find((p) => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) {
      alert('Missing agency context.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/planned-purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          projectId: projectId || null,
          quotationId: quotationId || null,
          vendorId: vendorId || null,
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

      if (!res.ok) throw new Error('Failed to create planned purchase order');

      router.push(`/dashboard/procurement/planned-purchase-orders`);
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
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Create Planned Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-background border border-border rounded-3xl p-6 space-y-6 shadow-sm">
        
        {/* Quotation Search & Select Field */}
        <div className="space-y-2" ref={quotationDropdownRef}>
          <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
            Link Quotation <span className="normal-case font-medium text-muted-foreground/70">(optional)</span>
          </label>
          <div className="relative">
            {selectedQuotationObj ? (
              <div className="flex items-center justify-between w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground">
                <span>
                  {selectedQuotationObj.quotationNo || `Quotation #${selectedQuotationObj.id.slice(0, 8)}`} - {selectedQuotationObj.currency} {selectedQuotationObj.plannedAmount ?? selectedQuotationObj.amount}
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
                            {q.description ? `${q.description.slice(0, 50)}...` : 'No description'} — {q.currency} {q.plannedAmount ?? q.amount ?? 0}
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
          
          {/* Single Vendor Dropdown with Search */}
          <div className="md:col-span-2 space-y-2" ref={vendorDropdownRef}>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
              Vendor 
            </label>
            <div className="relative">
              {selectedVendorObj ? (
                <div className="flex items-center justify-between w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground">
                  <span>{selectedVendorObj.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVendorId('');
                      setVendorSearch('');
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
                      placeholder="Search and select vendor..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setIsVendorDropdownOpen(true);
                      }}
                      onFocus={() => setIsVendorDropdownOpen(true)}
                      className="w-full bg-background border border-border rounded-2xl pl-9 pr-3 py-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {isVendorDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-2xl shadow-lg max-h-52 overflow-y-auto">
                      <div
                        onClick={() => {
                          setVendorId('');
                          setIsVendorDropdownOpen(false);
                          setVendorSearch('');
                        }}
                        className="p-3 text-xs font-bold text-muted-foreground hover:bg-muted/50 cursor-pointer border-b border-border"
                      >
                        No Vendor
                      </div>
                      {filteredVendors.length > 0 ? (
                        filteredVendors.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setVendorId(v.id);
                              setIsVendorDropdownOpen(false);
                              setVendorSearch('');
                            }}
                            className="p-3 text-xs font-bold text-foreground hover:bg-muted/50 cursor-pointer border-b border-border last:border-none"
                          >
                            {v.name}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-muted-foreground text-center">No vendors found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Project Search & Select Field */}
          <div className="space-y-2" ref={projectDropdownRef}>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
              Project <span className="normal-case font-medium text-muted-foreground/70">(optional)</span>
            </label>
            <div className="relative">
              {selectedProjectObj ? (
                <div className="flex items-center justify-between w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground uppercase">
                  <span>{selectedProjectObj.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectId('');
                      setProjectSearch('');
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
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(e) => {
                        setProjectSearch(e.target.value);
                        setIsProjectDropdownOpen(true);
                      }}
                      onFocus={() => setIsProjectDropdownOpen(true)}
                      className="w-full bg-background border border-border rounded-2xl pl-9 pr-3 py-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
                    />
                  </div>

                  {isProjectDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => {
                          setProjectId('');
                          setIsProjectDropdownOpen(false);
                          setProjectSearch('');
                        }}
                        className="p-3 text-xs font-bold text-muted-foreground hover:bg-muted/50 cursor-pointer border-b border-border uppercase"
                      >
                        No Project
                      </div>
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProjectId(p.id);
                              setIsProjectDropdownOpen(false);
                              setProjectSearch('');
                            }}
                            className="p-3 text-xs font-bold text-foreground hover:bg-muted/50 cursor-pointer border-b border-border last:border-none uppercase"
                          >
                            {p.name}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-muted-foreground text-center uppercase">No projects found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Planned Items</label>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600/20 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
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
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <p className="text-xs font-black uppercase tracking-wider text-foreground">
              Total Planned Amount: <span className="text-blue-600">{currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
            {loading ? 'Creating...' : 'Save Planned Order'}
          </button>
        </div>
      </form>
    </div>
  );
}