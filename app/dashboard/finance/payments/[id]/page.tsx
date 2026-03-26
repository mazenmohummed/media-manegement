"use client";

import React, { useState, useEffect, use } from "react";
import { 
  Calendar, User, CreditCard, ArrowLeft, 
  Download, CheckCircle2, Loader2, Landmark 
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const paymentId = resolvedParams.id;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPayment() {
      if (!paymentId || paymentId === "undefined") return;
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPayment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayment();
  }, [paymentId]);

  const handleDownloadPDF = () => {
    window.print(); // Trigger browser's native print-to-pdf
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  if (!payment) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <p className="font-black uppercase italic tracking-widest text-rose-500">Record Not Found</p>
      <button onClick={() => router.back()} className="text-xs font-bold uppercase underline">Back to Ledger</button>
    </div>
  );

  return (
    <div className="p-10 space-y-10 max-w-[1000px] mx-auto animate-in fade-in duration-500">
      
      {/* 1. PRINT CSS: This forces the PDF to only show the receipt card */}
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
            background: none !important;
          }
          /* Show ONLY the receipt card */
          .printable-receipt, .printable-receipt * {
            visibility: visible;
          }
          /* Center the receipt on the A4 page */
          .printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 1px solid #e2e8f0 !important;
            border-radius: 2rem !important;
            box-shadow: none !important;
          }
          /* Remove the "Print to PDF" header/footer from browser */
          @page {
            margin: 20mm;
          }
        }
      `}</style>

      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft size={14} /> Back to Ledger
        </button>
        
        <button 
          onClick={handleDownloadPDF} 
          className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
        >
          <Download size={14} /> Download PDF
        </button>
      </div>

      {/* RECEIPT CARD */}
      <div className="printable-receipt bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 italic">Transaction Verified</span>
          </div>
          <p className="font-mono text-[10px] font-bold text-emerald-700/50">REF: {payment.id.slice(-8).toUpperCase()}</p>
        </div>

        <div className="p-12 space-y-12">
          {/* MAIN AMOUNT */}
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">Total Amount Settled</p>
            <h1 className="text-7xl font-black italic tracking-tighter text-foreground">
              ${payment.amount.toLocaleString()}<span className="text-blue-600">.00</span>
            </h1>
          </div>

          <hr className="border-border border-dashed" />

          {/* GRID DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <DetailItem 
                icon={<User size={16} className="text-blue-600"/>} 
                label="Client Entity" 
                value={payment.client?.clientName || "N/A"} 
              />
              <DetailItem 
                icon={<Calendar size={16} className="text-blue-600"/>} 
                label="Date of Payment" 
                value={new Date(payment.datePaid).toLocaleDateString('en-US', { dateStyle: 'full' })} 
              />
            </div>
            <div className="space-y-6">
              <DetailItem 
                icon={<CreditCard size={16} className="text-blue-600"/>} 
                label="Settlement Method" 
                value={payment.method} 
              />
              <DetailItem 
                icon={<Landmark size={16} className="text-blue-600"/>} 
                label="Internal Voucher No." 
                value={payment.paymentNo || "MM-AUTO-GEN"} 
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-muted/30 p-8 border-t border-border text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-relaxed">
            Legal: This document serves as an official confirmation of funds received.<br />
            System Timestamp: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-3 bg-muted rounded-xl">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className="text-sm font-black uppercase italic tracking-tight">{value}</p>
      </div>
    </div>
  );
}