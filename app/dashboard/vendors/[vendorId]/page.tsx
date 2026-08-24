'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Plus, Edit3, X, Trash2 } from 'lucide-react';

type PurchaseOrderItem = {
  id?: string;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type PurchaseOrder = {
  id: string;
  poNo?: string;
  status: string;
  totalAmount: number;
  currency: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: PurchaseOrderItem[];
};

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.vendorId as string;

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isEditPoOpen, setIsEditPoOpen] = useState(false);

  // Categories State for Edit Modal
  const [existingCategories, setExistingCategories] = useState<{ id: string; name: string }[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [categorySelection, setCategorySelection] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Edit Vendor Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    status: 'ACTIVE',
    paymentTerms: '',
    email: '',
    phoneNumber: '',
    taxNumber: '',
    notes: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  const fetchVendor = () => {
    if (!vendorId) return;
    fetch(`/api/vendors/${vendorId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch vendor details');
        return res.json();
      })
      .then((data) => {
        setVendor(data);
        setFormData({
          name: data.name || '',
          categoryId: data.categoryId || '',
          status: data.status || 'ACTIVE',
          paymentTerms: data.paymentTerms || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          taxNumber: data.taxNumber || '',
          notes: data.notes || '',
          address: {
            line1: data.address?.line1 || '',
            line2: data.address?.line2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            postalCode: data.address?.postalCode || '',
            country: data.address?.country || '',
          },
        });
        setCategorySelection(data.categoryId || '');
        setLoading(false);
        
        if (data.agencyId) {
          fetchCategories(data.agencyId);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchCategories = async (agencyId: string) => {
    setFetchingCategories(true);
    try {
      const res = await fetch(`/api/vendor-categories?agencyId=${agencyId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExistingCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setFetchingCategories(false);
    }
  };

  useEffect(() => {
    fetchVendor();
  }, [vendorId]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'categorySelection') {
      if (value === 'NEW_CATEGORY') {
        setIsCustomCategory(true);
        setCategorySelection('NEW_CATEGORY');
        setFormData({ ...formData, categoryId: '' });
        setCustomCategoryName('');
      } else {
        setIsCustomCategory(false);
        setCategorySelection(value);
        setFormData({ ...formData, categoryId: value });
      }
    } else if (name === 'customCategoryName') {
      setCustomCategoryName(value);
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCategoryId = formData.categoryId;

      if (isCustomCategory && customCategoryName.trim()) {
        const catRes = await fetch(`/api/vendor-categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customCategoryName.trim(), agencyId: vendor.agencyId }),
        });
        if (!catRes.ok) throw new Error('Failed to create new category');
        const newCat = await catRes.json();
        finalCategoryId = newCat.id;
      }

      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, categoryId: finalCategoryId }),
      });
      if (!res.ok) throw new Error('Failed to update vendor');
      setIsEditOpen(false);
      fetchVendor();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVendor = async () => {
    if (!window.confirm(`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete vendor');

      router.push('/dashboard/vendors');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting vendor');
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-bold uppercase tracking-widest">Loading vendor details...</div>;
  if (error) return <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-widest">Error: {error}</div>;
  if (!vendor) return <div className="p-8 text-center text-xs font-bold uppercase tracking-widest">Vendor not found.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-background p-6 rounded-3xl shadow-sm border border-border gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{vendor.name}</h1>
            <span
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                vendor.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : vendor.status === 'INACTIVE'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              {vendor.status}
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
            Vendor No: {vendor.vendorNo || 'N/A'} | Category: {vendor.category?.name || 'Uncategorized'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="text-right hidden sm:block mr-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Payment Terms</p>
                <p className="text-xs font-black text-foreground uppercase">{vendor.paymentTerms || 'N/A'}</p>
            </div>
            <button
                onClick={() => {
                setCategorySelection(vendor.categoryId || '');
                setIsCustomCategory(false);
                setIsEditOpen(true);
                }}
                className="px-4 py-2.5 bg-background border border-border text-foreground text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-muted transition"
            >
                Edit Vendor
            </button>
            
            <button
                  onClick={() => router.push(`/dashboard/vendors/purchase-orders?search=${encodeURIComponent(vendor.name)}`)}
                  className="px-4 py-2.5 bg-background border border-border text-foreground text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-muted transition"
              >
                  View POs
              </button>

            <button
                onClick={() => router.push(`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`)}
                className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-700 transition shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
                + Purchase New Order
            </button>
            {/* Delete Vendor Button */}
            <button
                onClick={handleDeleteVendor}
                disabled={isDeleting}
                className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-red-500/20 transition disabled:opacity-50 inline-flex items-center gap-1"
                title="Delete Vendor"
            >
              <Trash2 size={16} />
            </button>
            </div>
      </div>

      {/* Grid Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contact Information</h3>
          <p className="text-xs font-bold text-foreground"><span className="text-muted-foreground">Email:</span> {vendor.email || 'N/A'}</p>
          <p className="text-xs font-bold text-foreground"><span className="text-muted-foreground">Phone:</span> {vendor.phoneNumber || 'N/A'}</p>
          <p className="text-xs font-bold text-foreground"><span className="text-muted-foreground">Tax Number:</span> {vendor.taxNumber || 'N/A'}</p>
        </div>

        <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Address</h3>
          {vendor.address ? (
            <div className="text-xs font-bold text-foreground space-y-1">
              <p>{vendor.address.line1}</p>
              {vendor.address.line2 && <p>{vendor.address.line2}</p>}
              <p>{vendor.address.city}, {vendor.address.state} {vendor.address.postalCode}</p>
              <p>{vendor.address.country}</p>
            </div>
          ) : (
            <p className="text-xs font-bold text-muted-foreground uppercase">No address provided.</p>
          )}
        </div>

        <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes</h3>
          <p className="text-xs font-bold text-foreground">{vendor.notes || 'No notes added for this vendor.'}</p>
        </div>
      </div>

      {/* Purchase Orders Section */}
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Purchase Orders</h3>
        {vendor.purchaseOrders && vendor.purchaseOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead className="bg-muted/40 uppercase text-[10px] font-black text-muted-foreground tracking-[0.2em]">
                <tr>
                  <th className="p-4">PO No</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendor.purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-black text-foreground uppercase">{po.poNo || po.id}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 inline-flex text-[9px] font-black uppercase tracking-widest rounded-full ${
                        po.status === 'CONFIRMED' || po.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        po.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 font-black text-foreground">
                      {po.currency || "EGP"} {po.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                    </td>
                    <td className="p-4 text-muted-foreground">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedPO(po);
                          setIsEditPoOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs font-bold uppercase"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-bold text-muted-foreground uppercase">No purchase orders found.</p>
        )}
      </div>

      {/* Performance Reviews Section */}
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Performance Reviews</h3>
        {vendor.performanceReviews && vendor.performanceReviews.length > 0 ? (
          <div className="space-y-4">
            {vendor.performanceReviews.map((review: any) => (
              <div key={review.id} className="p-4 border border-border rounded-2xl bg-muted/20 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-foreground uppercase">Rating: {review.rating} / 5</p>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5">{review.comment || 'No comments'}</p>
                </div>
                <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${review.onTimeDelivery ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                  {review.onTimeDelivery ? 'On-Time' : 'Delayed'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-bold text-muted-foreground uppercase">No performance reviews recorded.</p>
        )}
      </div>

      {/* Edit Vendor Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Edit Vendor</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-xl">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateVendor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                  {!isCustomCategory ? (
                    <div className="flex gap-2">
                      <select
                        name="categorySelection"
                        value={categorySelection}
                        onChange={handleCategoryChange}
                        disabled={fetchingCategories}
                        className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
                      >
                        <option value="">Select a category...</option>
                        {existingCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                        <option value="NEW_CATEGORY" className="font-black text-blue-600">
                          + Add New Category
                        </option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        name="customCategoryName"
                        value={customCategoryName}
                        onChange={handleCategoryChange}
                        className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                        placeholder="Enter new category name"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setCategorySelection(formData.categoryId || '');
                        }}
                        className="px-4 py-2 border border-border rounded-2xl text-xs font-bold uppercase text-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="BLACKLISTED">BLACKLISTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 border border-border text-foreground text-xs font-bold uppercase rounded-xl hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Modal Sub-component */}
      {isEditPoOpen && selectedPO && (
        <EditPurchaseOrderModal 
          purchaseOrder={selectedPO} 
          onClose={() => {
            setIsEditPoOpen(false);
            setSelectedPO(null);
            fetchVendor();
          }} 
        />
      )}
    </div>
  );
}

function EditPurchaseOrderModal({ purchaseOrder, onClose }: { purchaseOrder: PurchaseOrder; onClose: () => void }) {
  const router = useRouter();
  const [notes, setNotes] = useState(purchaseOrder.notes || "");
  const [status, setStatus] = useState(purchaseOrder.status || "DRAFT");
  const [currency, setCurrency] = useState(purchaseOrder.currency || "EGP");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    purchaseOrder.expectedDeliveryDate ? purchaseOrder.expectedDeliveryDate.split('T')[0] : ""
  );
  const [items, setItems] = useState<PurchaseOrderItem[]>(purchaseOrder.items ? purchaseOrder.items.map(i => ({ ...i })) : []);
  const [loading, setLoading] = useState(false);

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitCost') {
      const qty = field === 'quantity' ? Number(value) || 0 : newItems[index].quantity;
      const cost = field === 'unitCost' ? Number(value) || 0 : newItems[index].unitCost;
      newItems[index].total = qty * cost;
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitCost: 0, total: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          status,
          currency,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitCost: Number(i.unitCost) || 0,
            total: (Number(i.quantity) || 1) * (Number(i.unitCost) || 0),
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to update purchase order");

      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error updating purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border p-6 rounded-3xl max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
            Edit Purchase Order {purchaseOrder.poNo && `(${purchaseOrder.poNo})`}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-xl">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 uppercase"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground uppercase focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Expected Delivery</label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Items & Pricing Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Items & Pricing</label>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600/10 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600/20 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-3 rounded-2xl">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  className="col-span-5 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  placeholder="Description"
                  required
                />
                <input
                  type="number"
                  value={item.quantity}
                  min="1"
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  placeholder="Qty"
                  required
                />
                <input
                  type="number"
                  value={item.unitCost}
                  step="0.01"
                  min="0"
                  onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                  className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600"
                  placeholder="Unit Cost"
                  required
                />
                <div className="col-span-2 text-right text-xs font-black text-foreground">
                  {currency} {(Number(item.quantity || 0) * Number(item.unitCost || 0)).toFixed(2)}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <p className="text-xs font-black uppercase tracking-wider text-foreground">
              Total Amount: <span className="text-blue-600">{currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        {/* Notes Editor */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold focus:outline-none focus:border-blue-600 text-foreground"
            rows={3}
            placeholder="Add PO notes..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase border border-border text-foreground hover:bg-muted">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}