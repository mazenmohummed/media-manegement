'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.payments as string;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (paymentId) {
      fetch(`/api/payments/${paymentId}`)
        .then((res) => res.json())
        .then((data) => {
          setPayment(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [paymentId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this payment and reverse allocations?')) return;
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/dashboard/finance/payments');
    }
  };

  // Trigger PDF download from API
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const res = await fetch(`/api/payments/${paymentId}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${payment.referenceNo || paymentId.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Could not download PDF receipt.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) return <div className="p-6">Loading payment details...</div>;
  if (!payment || payment.error) return <div className="p-6 text-red-500">Payment not found.</div>;

  const paymentDisplayName = payment.referenceNo ? `#${payment.referenceNo}` : payment.paymentNo || payment.id.slice(-8);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Receipt: {paymentDisplayName}</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadPdf} 
            disabled={isGeneratingPdf}
            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 text-sm shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Receipt'}
          </button>
          <button 
            onClick={handleDelete} 
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm shadow-sm"
          >
            Delete / Reverse
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-8 mb-6">
        <div className="grid grid-cols-2 gap-6 mb-8 border-b pb-6">
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</span>
            <span className="text-lg font-medium text-gray-900">{payment.client?.clientName || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount Paid</span>
            <span className="text-lg font-bold text-indigo-600">{payment.amount} {payment.currency || 'USD'}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Method</span>
            <span className="text-sm font-medium text-gray-800">{payment.method}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
            <span className="text-sm font-medium text-gray-800">{payment.status || 'Completed'}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Paid</span>
            <span className="text-sm font-medium text-gray-800">{new Date(payment.datePaid).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Reference No</span>
            <span className="text-sm font-medium text-gray-800">{payment.referenceNo || 'N/A'}</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-800">Invoice Allocations</h3>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Allocated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payment.allocations?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">
                    No allocations found (Unallocated Payment).
                  </td>
                </tr>
              ) : (
                payment.allocations?.map((alloc: any) => (
                  <tr key={alloc.id}>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600">
                      <Link href={`/dashboard/finance/invoices/${alloc.invoice?.id}`} className="hover:underline">
                        {alloc.invoice?.invoiceNo || 'View Invoice'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{alloc.amount} {alloc.currency}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(alloc.allocatedAt).toLocaleDateString()}</td>
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