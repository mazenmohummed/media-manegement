"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// --- TYPES ---
interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  type: "Project" | "Payment";
  amount: number;
  category?: string;
  status?: "Paid" | "Pending" | "Overdue"; // Added for the payment table
}

export default function ClientDetailsPage() {
  const { id } = useParams();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // --- STATE: LEDGER DATA ---
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    { id: "L1", date: "2024-01-01", description: "Retainer Subscription - Jan", type: "Project", amount: 1500, category: "Consultation" },
    { id: "L2", date: "2024-01-05", description: "Wire Transfer #8812", type: "Payment", amount: 1500, status: "Paid" },
    { id: "L3", date: "2024-01-15", description: "Extra: Brand Guidelines PDF", type: "Project", amount: 800, category: "Design" },
    { id: "L4", date: "2024-02-01", description: "Retainer Subscription - Feb", type: "Project", amount: 1500, category: "Consultation" },
  ]);

  // --- CALCULATIONS ---
  const totals = useMemo(() => {
    const billed = ledger.filter(e => e.type === "Project").reduce((acc, curr) => acc + curr.amount, 0);
    const paid = ledger.filter(e => e.type === "Payment").reduce((acc, curr) => acc + curr.amount, 0);
    return { billed, paid, balance: billed - paid };
  }, [ledger]);

  // Filter only payments for the specific payment table
  const paymentEntries = useMemo(() => ledger.filter(e => e.type === "Payment"), [ledger]);

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <Link href="/clients" className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-foreground transition-colors mb-2 block">
            ← Return to Portfolio
          </Link>
          <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Mario's Italian</h1>
          <div className="flex gap-3 mt-2">
            <span className="bg-card border border-border px-3 py-1 rounded-lg font-mono text-[10px] text-muted-foreground uppercase">ID_{id}</span>
            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest">Active Account</span>
          </div>
        </div>

        <button 
          onClick={() => setShowPaymentForm(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          Record Payment +
        </button>
      </header>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Gross Billed</p>
          <h3 className="text-3xl font-black font-mono tracking-tighter">${totals.billed.toLocaleString()}</h3>
        </div>
        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Revenue Collected</p>
          <h3 className="text-3xl font-black font-mono tracking-tighter text-emerald-500">${totals.paid.toLocaleString()}</h3>
        </div>
        <div className="bg-foreground p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] font-black text-background/50 uppercase tracking-widest mb-1">Outstanding Balance</p>
          <h3 className="text-3xl font-black font-mono tracking-tighter text-background">
            ${totals.balance.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* NEW: CLIENT PAYMENTS TABLE */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Payment Receipt Tracker</h2>
        </div>
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-600/5 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Receipt Date</th>
                <th className="p-6">Method / Description</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {paymentEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-blue-500/[0.02] transition-colors">
                  <td className="p-6 font-mono text-[11px] text-muted-foreground">{entry.date}</td>
                  <td className="p-6">
                    <p className="font-black text-foreground text-sm uppercase tracking-tight">{entry.description}</p>
                    <p className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">Verified Receipt</p>
                  </td>
                  <td className="p-6">
                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">
                      {entry.status || "Paid"}
                    </span>
                  </td>
                  <td className="p-6 text-right font-mono font-black text-emerald-500">
                    +${entry.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paymentEntries.length === 0 && (
            <div className="p-16 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">
              No Payment History Recorded
            </div>
          )}
        </div>
      </section>

      {/* FULL STATEMENT OF ACCOUNT */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">General Ledger (All Activity)</h2>
        </div>
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden text-opacity-50">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[9px] uppercase font-black text-muted-foreground tracking-widest">
              <tr>
                <th className="p-6">Date</th>
                <th className="p-6">Activity Description</th>
                <th className="p-6 text-right">Debit (+)</th>
                <th className="p-6 text-right">Credit (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-6 font-mono text-[11px] text-muted-foreground">{entry.date}</td>
                  <td className="p-6">
                    <p className="font-black text-foreground text-sm uppercase tracking-tight">{entry.description}</p>
                    {entry.category && (
                      <span className="text-[9px] font-black bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase mt-1 inline-block">
                        {entry.category}
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right font-mono font-black text-rose-500">
                    {entry.type === "Project" ? `$${entry.amount.toLocaleString()}` : "—"}
                  </td>
                  <td className="p-6 text-right font-mono font-black text-emerald-500">
                    {entry.type === "Payment" ? `$${entry.amount.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowPaymentForm(false)} />
          <div className="relative bg-card w-full max-w-xl rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border bg-muted/30 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Record Client Payment</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Manual Revenue Entry</p>
              </div>
              <button onClick={() => setShowPaymentForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Amount Received ($)</label>
                  <input required type="number" placeholder="0.00" className="w-full bg-muted/50 border-none rounded-2xl p-4 font-mono text-lg outline-none focus:ring-2 ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Payment Date</label>
                  <input required type="date" className="w-full bg-muted/50 border-none rounded-2xl p-4 text-xs font-bold uppercase outline-none focus:ring-2 ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Method</label>
                  <select className="w-full bg-muted/50 border-none rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500/20 appearance-none">
                    <option>Wire Transfer</option>
                    <option>Stripe / CC</option>
                    <option>PayPal</option>
                    <option>Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 px-6 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-6 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all">
                  Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}