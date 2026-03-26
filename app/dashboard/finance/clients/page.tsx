"use client";

import React, { useState, useEffect } from "react";
import { 
  Briefcase, TrendingUp, AlertCircle, ArrowUpRight, 
  ChevronRight, Wallet, Receipt, Loader2, Landmark, 
  ArrowDownRight, User
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientFinancePage() {
  const router = useRouter(); 
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinanceData() {
      try {
        const res = await fetch("/api/finance/clients");
        const data = await res.json();
        setClients(data);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchFinanceData();
  }, []);

  // Aggregating all payments for the bottom table
  const allPayments = clients.flatMap(c => 
    (c.payments || []).map((p: any) => ({ ...p, clientName: c.name }))
  );

  const totalOutstanding = clients.reduce((acc, c) => acc + parseFloat(c.due || "0"), 0);
  const totalProfit = clients.reduce((acc, c) => acc + parseFloat(c.profit || "0"), 0);
  const totalCost = clients.reduce((acc, c) => acc + parseFloat(c.cost || "0"), 0);

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-10 space-y-16 max-w-[1600px]">
      <header className="flex justify-between items-end border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Landmark size={14} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Agency Financial Intelligence</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground">
            Financial <span className="text-blue-600">Ledger</span>
          </h1>
        </div>
      </header>

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ClientStatCard 
          label="Total Outstanding" 
          value={`$${totalOutstanding.toLocaleString()}`} 
          sub="Pending Receivables" 
          color="rose" 
          icon={<AlertCircle size={18}/>} 
        />
        <ClientStatCard 
          label="Net Agency Profit" 
          value={`$${totalProfit.toLocaleString()}`} 
          sub="Post-Production Income" 
          color="emerald" 
          icon={<TrendingUp size={18}/>} 
        />
        <ClientStatCard 
          label="Total Delivery Cost" 
          value={`$${totalCost.toLocaleString()}`} 
          sub="Prod + External Rentals" 
          color="blue" 
          icon={<ArrowDownRight size={18}/>} 
        />
      </div>

      {/* CLIENT PERFORMANCE TABLE */}
      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-3">
            <User size={20} className="text-blue-600"/> Client Performance
        </h2>
        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-8">Entity</th>
                <th className="p-8">Profit vs Cost</th>
                <th className="p-8">Outstanding</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

     {/* PAYMENTS LOG */}
      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-3">
            <Receipt size={20} className="text-emerald-600"/> Transaction Log
        </h2>
        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-8">Date</th>
                <th className="p-8">Client</th>
                <th className="p-8">Method</th>
                <th className="p-8 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {allPayments
                .sort((a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime())
                .map((p: any) => (
                  <tr 
                    key={p.id} 
                    onClick={() => router.push(`/dashboard/finance/payments/${p.id}`)}
                    className="hover:bg-muted/10 transition-colors cursor-pointer group"
                  >
                    <td className="p-8 text-[10px] text-muted-foreground group-hover:text-foreground">
                      {new Date(p.datePaid).toLocaleDateString()}
                    </td>
                    <td className="p-8 font-black uppercase italic text-xs tracking-tighter">
                      {p.clientName}
                    </td>
                    <td className="p-8">
                      <span className="px-3 py-1 bg-muted rounded-full text-[8px] font-black uppercase tracking-widest group-hover:bg-foreground group-hover:text-background transition-colors">
                        {p.method}
                      </span>
                    </td>
                    <td className="p-8 text-right font-black text-emerald-500 text-sm italic">
                      +${p.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --- SUB-COMPONENTS (Defined here to fix the "Cannot find name" error) ---

function ClientStatCard({ label, value, sub, color, icon }: any) {
  const themes: any = {
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/20",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20"
  };
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border flex justify-between items-start group hover:scale-[1.02] transition-all">
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-3xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl ${themes[color]}`}>{icon}</div>
    </div>
  );
}

function ClientRow({ client }: { client: any }) {
  const router = useRouter(); // Initialize the router
  const isOverdue = parseFloat(client.due) > 0;

  return (
    <tr className="group hover:bg-muted/5 transition-colors">
      <td className="p-8">
        <p className="font-black text-sm uppercase tracking-tight italic">{client.name}</p>
        <p className="text-[9px] text-blue-600 font-bold uppercase">{client.projectsCount} Projects</p>
      </td>
      <td className="p-8">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm text-emerald-500">
            +${parseFloat(client.profit).toLocaleString()}
          </span>
          <ArrowUpRight size={12} className="text-emerald-500" />
        </div>
        <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest">
          Total Cost: ${parseFloat(client.cost).toLocaleString()}
        </p>
      </td>
      <td className="p-8">
        <p className={`font-mono font-black text-sm ${isOverdue ? 'text-rose-500' : 'text-muted-foreground opacity-30'}`}>
          ${parseFloat(client.due).toLocaleString()}
        </p>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[8px] font-black uppercase text-muted-foreground">{client.status}</span>
        </div>
      </td>
      <td className="p-8 text-right">
        {/* Updated Button with Navigation */}
        <button 
          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
          className="p-3 bg-muted rounded-xl hover:bg-foreground hover:text-background transition-all cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </td>
    </tr>
  );
}