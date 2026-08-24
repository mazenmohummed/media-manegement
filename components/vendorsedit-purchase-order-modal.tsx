'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Trash2 } from 'lucide-react';

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

export default function EditPurchaseOrderModal({
  purchaseOrder,
  onClose,
}: {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(purchaseOrder.notes || '');
  const [status, setStatus] = useState(purchaseOrder.status || 'DRAFT');
  const [currency, setCurrency] = useState(purchaseOrder.currency || 'EGP');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    purchaseOrder.expectedDeliveryDate ? purchaseOrder.expectedDeliveryDate.split('T')[0] : ''
  );
  const [items, setItems] = useState<PurchaseOrderItem[]>(
    purchaseOrder.items.map((i) => ({ ...i })) || []
  );
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

      if (!res.ok) throw new Error('Failed to update purchase order');

      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error saving purchase order modifications.');
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}