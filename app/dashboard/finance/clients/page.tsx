"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, AlertCircle, ArrowUpRight, 
  ChevronRight, Receipt, Loader2, Landmark, 
  ArrowDownRight, User, Search, Calendar, Wallet
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Payment {
  id: string;
  amount: number;
  datePaid: string;
  method: string;
  clientName: string;
}

interface ClientData {
  id: string;
  name: string;
  projectsCount: number;
  profit: string;
  totalExpenses: string;
  due: string;
  status: string;
  lastPayments: Array<{
    id: string;
    amount: number;
    datePaid: string;
    method: string;
  }>;
}

export default function ClientFinancePage() {
  const router = useRouter(); 
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ── FILTER STATES ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // Empty means "All Methods"

  useEffect(() => {
    async function fetchFinanceData() {
      try {
        const res = await fetch("/api/finance/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (err) { 
        console.error("Failed to pull agency financial records:", err); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchFinanceData();
  }, []);

  // ── FILTER LOGIC ──────────────────────────────────────────────────────────
  // Filters clients based on search query match and payment method used in history if selected
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!paymentMethod) return matchesSearch;
      
      // If a method is picked, check if this client has any corresponding payments
      const hasMatchingPayment = (client.lastPayments || []).some(
        p => p.method.toLowerCase() === paymentMethod.toLowerCase() || 
             (paymentMethod === "Stripe" && p.method.toLowerCase().includes("stripe"))
      );
      
      return matchesSearch && hasMatchingPayment;
    });
  }, [clients, searchQuery, paymentMethod]);

  // Filters transaction log history dynamically by name, date thresholds, and selected method
  const filteredPayments = useMemo(() => {
    return clients
      .flatMap(c => 
        (c.lastPayments || []).map((p) => ({ 
          ...p, 
          clientName: c.name 
        }))
      )
      .filter((p) => {
        const matchesSearch = p.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Date evaluations
        const paymentTime = new Date(p.datePaid).getTime();
        const startThreshold = startDate ? new Date(startDate).getTime() : null;
        const endThreshold = endDate ? new Date(endDate).getTime() : null;
        
        const matchesStart = startThreshold ? paymentTime >= startThreshold : true;
        const matchesEnd = endThreshold ? paymentTime <= endThreshold + 86400000 : true;

        // Method evaluation (Normalizes inputs like Stripe / Card vs Stripe)
        const matchesMethod = !paymentMethod || 
          p.method.toLowerCase() === paymentMethod.toLowerCase() ||
          (paymentMethod === "Stripe" && p.method.toLowerCase().includes("stripe"));

        return matchesSearch && matchesStart && matchesEnd && matchesMethod;
      })
      .sort((a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime());
  }, [clients, searchQuery, startDate, endDate, paymentMethod]);

  // Financial summary metrics adapt to current selection boundaries
  const totals = useMemo(() => {
    return filteredClients.reduce((acc, c) => {
      acc.outstanding += parseFloat(c.due || "0");
      acc.profit += parseFloat(c.profit || "0");
      acc.cost += parseFloat(c.totalExpenses || "0");
      return acc;
    }, { outstanding: 0, profit: 0, cost: 0 });
  }, [filteredClients]);

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-10 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">
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

      {/* FILTER BAR: NAME, DATES, & METHOD OPTIONS */}
      <div className="bg-card border border-border p-5 rounded-3xl shadow-sm grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
        {/* Client Name Input */}
        <div className="relative group">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text"
            placeholder="Search client entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500/50 focus:bg-background transition-all"
          />
        </div>

        {/* Start Date Picker */}
        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>

        {/* End Date Picker */}
        <div className="relative">
          <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-background transition-all appearance-none"
          />
        </div>

        {/* Method Select Filter */}
        <div className="relative">
          <Wallet size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-background transition-all appearance-none cursor-pointer"
          >
            <option value="">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="InstaPay">InstaPay</option>
            <option value="Stripe">Stripe / Card</option>
          </select>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ClientStatCard 
          label="Total Outstanding" 
          value={`$${totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          sub="Filtered Pending Receivables" 
          color="rose" 
          icon={<AlertCircle size={18}/>} 
        />
        <ClientStatCard 
          label="Net Agency Profit" 
          value={`$${totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          sub="Filtered Income" 
          color="emerald" 
          icon={<TrendingUp size={18}/>} 
        />
        <ClientStatCard 
          label="Total Delivery Cost" 
          value={`$${totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          sub="Filtered Outflows" 
          color="blue" 
          icon={<ArrowDownRight size={18}/>} 
        />
      </div>

      {/* CLIENT PERFORMANCE TABLE */}
      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-3 text-foreground">
          <User size={20} className="text-blue-600"/> Client Performance Pipeline
        </h2>
        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
                <tr>
                  <th className="p-8">Entity</th>
                  <th className="p-8">Profit vs Production Cost</th>
                  <th className="p-8">Outstanding Balance</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                      No matching client metrics match current filter rules.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <ClientRow key={client.id} client={client} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PAYMENTS LOG */}
      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-3 text-foreground">
          <Receipt size={20} className="text-emerald-600"/> Transaction History Log
        </h2>
        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/30 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
                <tr>
                  <th className="p-8">Settlement Date</th>
                  <th className="p-8">Client Entity</th>
                  <th className="p-8">Method</th>
                  <th className="p-8 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                      No matching records found inside specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p: Payment) => (
                    <tr 
                      key={p.id} 
                      onClick={() => router.push(`/dashboard/finance/payments/${p.id}`)}
                      className="hover:bg-muted/10 transition-colors cursor-pointer group"
                    >
                      <td className="p-8 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                        {new Date(p.datePaid).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-8 font-black uppercase italic text-xs tracking-tighter text-foreground">
                        {p.clientName}
                      </td>
                      <td className="p-8">
                        <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-[8px] font-black uppercase tracking-widest group-hover:bg-foreground group-hover:text-background transition-colors">
                          {p.method}
                        </span>
                      </td>
                      <td className="p-8 text-right font-black text-emerald-500 text-sm italic">
                        +{p.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- SUB-COMPONENTS ---
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: "rose" | "emerald" | "blue";
  icon: React.ReactNode;
}

function ClientStatCard({ label, value, sub, color, icon }: StatCardProps) {
  const themes = {
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/20",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20"
  };

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border flex justify-between items-start group hover:scale-[1.02] transition-all duration-300">
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-3xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl border ${themes[color]}`}>{icon}</div>
    </div>
  );
}

function ClientRow({ client }: { client: ClientData }) {
  const isOverdue = parseFloat(client.due) > 0;

  return (
    <tr className="group hover:bg-muted/5 transition-colors">
      <td className="p-8">
        <p className="font-black text-sm uppercase tracking-tight italic text-foreground">{client.name}</p>
        <p className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">{client.projectsCount} Active Projects</p>
      </td>
      <td className="p-8">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm text-emerald-500">
            +${parseFloat(client.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <ArrowUpRight size={12} className="text-emerald-500" />
        </div>
        <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mt-0.5">
          Total Cost: ${parseFloat(client.totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </td>
      <td className="p-8">
        <p className={`font-mono font-black text-sm ${isOverdue ? 'text-rose-500' : 'text-muted-foreground opacity-30'}`}>
          ${parseFloat(client.due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[8px] font-black uppercase text-muted-foreground/80 tracking-wider">{client.status}</span>
        </div>
      </td>
      <td className="p-8 text-right">
        <Link 
          href={`/dashboard/clients/${client.id}`}
          className="inline-block p-3 bg-muted text-muted-foreground rounded-xl hover:bg-foreground hover:text-background transition-all duration-200"
        >
          <ChevronRight size={16} />
        </Link>
      </td>
    </tr>
  );
}