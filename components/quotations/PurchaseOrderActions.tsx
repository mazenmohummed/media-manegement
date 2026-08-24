'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, CheckCircle2, XCircle, X, Plus, Trash } from 'lucide-react';

interface Item {
  id?: string;
  description: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrderActionsProps {
  purchaseOrder: {
    id: string;
    poNo: string | null;
    status: string;
    currency: string;
    notes?: string | null;
    expectedDeliveryDate?: Date | null;
    items: Item[];
  };
}

export default function PurchaseOrderActions({ purchaseOrder }: PurchaseOrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form state
  const [status, setStatus] = useState(purchaseOrder.status);
  const [currency, setCurrency] = useState(purchaseOrder.currency || 'EGP');
  const [notes, setNotes] = useState(purchaseOrder.notes || '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    purchaseOrder.expectedDeliveryDate 
      ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] 
      : ''
  );
  const [items, setItems] = useState<Item[]>(
    purchaseOrder.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost,
    }))
  );

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitCost: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      router.refresh();
    } catch (error) {
      alert('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          currency,
          notes, 
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
          items,
        }),
      });

      if (!res.ok) throw new Error('Failed to update purchase order');
      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      alert('Error updating purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete purchase order');
      router.push('/dashboard/procurement/purchase-orders');
      router.refresh();
    } catch (error) {
      alert('Error deleting purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {purchaseOrder.status !== 'DELIVERED' && (
          <button
            onClick={() => handleStatusChange('DELIVERED')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Mark Delivered
          </button>
        )}

        {purchaseOrder.status !== 'CANCELLED' && (
          <button
            onClick={() => handleStatusChange('CANCELLED')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold uppercase hover:bg-rose-500/20 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} /> Cancel
          </button>
        )}

        <button
          onClick={() => setIsEditOpen(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold uppercase hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <Edit size={14} /> Edit
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Edit Modal Overlay */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">Edit Purchase Order ({purchaseOrder.poNo})</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="INVOICED">INVOICED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Dynamic Items Section */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Unit Cost"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Internal Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}