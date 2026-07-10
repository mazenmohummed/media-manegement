"use client";

import React, { useState, useEffect, use } from "react";
import { 
  Calendar, User, CreditCard, ArrowLeft, 
  CheckCircle2, Loader2, Landmark, Trash2, Edit2, X, Printer 
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const paymentId = resolvedParams.id;
  const router = useRouter();

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit fields state container
  const [editForm, setEditForm] = useState({ amount: "", method: "", description: "" });

  const fetchPayment = async () => {
    if (!paymentId || paymentId === "undefined") return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`);
      if (!res.ok) throw new Error("Failed to fetch payment documentation layout.");
      const data = await res.json();
      setPayment(data);
      setEditForm({
        amount: data.amount.toString(),
        method: data.method,
        description: data.description || "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMutating(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editForm.amount),
          method: editForm.method,
          description: editForm.description,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        await fetchPayment();
      } else {
        alert("Failed to modify transaction entries.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!window.confirm("Are you absolute sure you want to delete and revert this transaction from ledger? This updates invoices status backwards.")) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/dashboard/clients/${payment?.clientId || ""}`);
        router.refresh();
      } else {
        alert("Reversal protection error.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!payment) return <div className="p-12 font-bold uppercase text-center text-xs tracking-widest text-muted-foreground">Voucher identity mapping mismatched.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 print:p-0 print:bg-white">
      
      {/* ─── INJECTED GLOBAL PRINT OVERRIDES WITH EXPRESS A4 CONSTRAINTS ─── */}
      <style jsx global>{`
        @media print {
          /* Enforce exact portrait A4 sheet dimensions with zero margin spillover */
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }

          /* Force backgrounds and colors to compile perfectly on ink layouts */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          main, div, nav, aside {
            background: transparent !important;
            box-shadow: none !important;
          }
          
          /* Hide surrounding layout elements cleanly */
          body * {
            visibility: hidden !important;
          }
          
          /* Show and format only the voucher print block */
          #isolated-voucher-print-area, #isolated-voucher-print-area * {
            visibility: visible !important;
          }
          
          /* Stretch perfectly across the targeted layout area */
          #isolated-voucher-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          /* Ensure grids drop perfectly inline side-by-side on A4 width widths */
          .print-grid-split {
            display: grid !important;
            grid-template-cols: repeat(2, minmax(0, 1fr)) !important;
            gap: 2rem !important;
          }
        }
      `}</style>

      {/* ACTION TOPBAR */}
      <div className="flex justify-between items-center print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Escape Frame
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10 active:scale-95"
          >
            <Printer size={12} /> Print Voucher
          </button>
          
          <button 
            disabled={isMutating}
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 bg-card border border-border hover:bg-muted text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
          >
            <Edit2 size={12} /> Edit Voucher
          </button>
          
          <button 
            disabled={isMutating}
            onClick={handleDeletePayment}
            className="flex items-center gap-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-rose-500/10"
          >
            <Trash2 size={12} /> Delete & Revert
          </button>
        </div>
      </div>

      {/* RENDER THE PAYMENT VOUCHER COMPONENT VISUAL SHEET */}
      <div 
        id="isolated-voucher-print-area" 
        className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden print:bg-white print:p-0 print:border-none print:shadow-none print:rounded-none"
      >
        <div className="p-8 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center print:bg-transparent print:border-b print:border-neutral-200 print:pb-6 print:flex-row print:justify-between print:items-center">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1 print:border-neutral-300 print:text-black">
              <CheckCircle2 size={10} /> Authenticated Deposit
            </span>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground print:text-black">
              Voucher Ref: {payment.paymentNo || "UNASSIGNED"}
            </h1>
          </div>
          <div className="sm:text-right print:text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest print:text-neutral-500">Transaction Sum</p>
            <p className="text-4xl font-black italic tracking-tight text-emerald-500 font-mono print:text-black">
              + ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Added custom print class to enforce grid splitting on fixed A4 dimensions */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm print-grid-split print:pt-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted rounded-xl print:hidden"><User size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 print:text-neutral-500">Entity Source</p>
                <p className="font-black uppercase tracking-tight text-foreground text-base print:text-black">{payment.client?.clientName}</p>
                <p className="text-[10px] text-muted-foreground font-mono print:text-neutral-600">ID: {payment.client?.clientNo || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted rounded-xl print:hidden"><Calendar size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 print:text-neutral-500">Authorization Timestamp</p>
                <p className="font-bold text-foreground print:text-black">{new Date(payment.datePaid).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted rounded-xl print:hidden"><CreditCard size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 print:text-neutral-500">Settlement Channel</p>
                <p className="font-bold text-foreground uppercase tracking-wider print:text-black">{payment.method}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted rounded-xl print:hidden">
                <Landmark size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 print:text-neutral-500">
                  Allocated Accounting Notes
                </p>
                {payment.project ? (
                  <p className="text-foreground font-bold print:text-black">
                    Allocated to: <span className="text-blue-600 font-mono uppercase print:text-black">{payment.project.projectName}</span> ({payment.project.invoiceNo || "N/A"})
                  </p>
                ) : (
                  <p className="text-amber-600 text-xs font-bold uppercase tracking-wide print:text-black">
                    Unallocated General Retainer Balance
                  </p>
                )}
                <p className="text-muted-foreground font-medium text-xs mt-1 print:text-neutral-700">
                  {payment.description || "No manual summary log append recorded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT OVERLAY MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <form onSubmit={handleUpdatePayment} className="bg-card border w-full max-w-md p-8 rounded-[2rem] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">Modify Voucher</h2>
              <X className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setShowEditModal(false)} />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Adjust Remittance Amount ($)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-muted p-4 rounded-xl outline-none border border-border font-black text-lg text-foreground focus:border-blue-600 transition-all" 
                  value={editForm.amount} 
                  onChange={e => setEditForm({...editForm, amount: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Remittance Method</label>
                <select 
                  className="w-full bg-muted p-4 rounded-xl outline-none border border-border font-bold text-foreground appearance-none cursor-pointer text-sm"
                  value={editForm.method}
                  onChange={e => setEditForm({...editForm, method: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="InstaPay">InstaPay</option>
                  <option value="Stripe">Stripe / Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Description / Notes</label>
                <textarea 
                  className="w-full bg-muted p-4 rounded-xl outline-none border border-border font-medium text-foreground text-sm h-20 resize-none" 
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                />
              </div>
            </div>

            <button 
              disabled={isMutating}
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black uppercase py-4 rounded-xl tracking-widest flex items-center justify-center gap-2 mt-2 transition-all"
            >
              {isMutating ? <Loader2 className="animate-spin" size={16} /> : "Commit Adjustments"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}