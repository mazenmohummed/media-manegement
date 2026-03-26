"use client";

import React, { useEffect, useState } from "react";
import { 
  Receipt, Zap, Globe, Shield, ArrowDownRight, 
  Calendar, CreditCard, Plus, Loader2, X 
} from "lucide-react";

export default function OverheadFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    resourceName: "",
    amount: "",
    category: "Software",
    status: "Pending",
    date: new Date().toISOString().split('T')[0]
  });

  
    const fetchOverhead = async () => {
    try {
      const res = await fetch("/api/finance/overhead");
      const json = await res.json();
      
      // Safety Net: Ensure the structure exists even if API partially fails
      setData({
        expenses: json.expenses || [],
        metrics: json.metrics || { totalBurn: 0, fixedMonthly: 0, saasTools: 0, taxLegal: 0 }
      });
    } catch (err) {
      console.error(err);
      // Fallback state on error
      setData({ expenses: [], metrics: { totalBurn: 0, fixedMonthly: 0, saasTools: 0, taxLegal: 0 } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverhead(); }, []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true); 

  try {
    const res = await fetch("/api/finance/overhead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // IMPORTANT: Replace 'your-agency-id' with a real ID from your MongoDB 'Agency' collection
      body: JSON.stringify({ ...formData, agencyId: "clwp..." }), 
    });

    const result = await res.json();

    if (res.ok) {
      setIsModalOpen(false);
      setFormData({ // Reset form
        resourceName: "",
        amount: "",
        category: "Software",
        status: "Pending",
        date: new Date().toISOString().split('T')[0]
      });
      await fetchOverhead(); // Refresh the list
    } else {
      alert(`Backend Error: ${result.error}`);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    alert("Failed to connect to server.");
  } finally {
    setIsSaving(false);
  }
};

  // If loading is true OR data hasn't arrived yet, show the loader
if (loading || !data) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-slate-600" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
        Synchronizing Ledger...
      </p>
    </div>
  );
}

  return (
    <div className="p-10 space-y-10 max-w-[1600px]">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Receipt size={14} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Fixed Costs & Burn Rate</span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground">
            Agency <span className="text-slate-600">Overhead</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-card border border-border px-6 py-3 rounded-2xl shadow-sm">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Monthly Burn Rate</p>
            <p className="text-2xl font-black font-mono text-rose-600 italic">
              ${data?.metrics?.totalBurn?.toLocaleString() ?? "0"}
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={14} strokeWidth={3} /> Record Expense
          </button>
        </div>
      </header>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverheadStatCard 
          label="Fixed Monthly" 
          value={`$${data?.metrics?.fixedMonthly ?? "0"}`} 
          sub="Rent & Utilities" 
          color="slate" 
          icon={<Globe size={18}/>} 
        />
        <OverheadStatCard 
          label="SaaS & Tools" 
          value={`$${data?.metrics?.saasTools ?? "0"}`} 
          sub="Software Subscriptions" 
          color="blue" 
          icon={<Zap size={18}/>} 
        />
        <OverheadStatCard 
          label="Tax & Legal" 
          value={`$${data?.metrics?.taxLegal ?? "0"}`} 
          sub="Compliance Reserves" 
          color="orange" 
          icon={<Shield size={18}/>} 
        />
      </div>

      {/* TABLE */}
      <section className="space-y-6">
        <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
              <tr>
                <th className="p-8">Expense Item</th>
                <th className="p-8">Category</th>
                <th className="p-8">Date</th>
                <th className="p-8">Amount</th>
                <th className="p-8 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-sm">
              {data?.expenses?.length > 0 ? (
                data.expenses.map((exp: any) => (
                  <ExpenseRow 
                    key={exp.id}
                    name={exp.resourceName} 
                    category={exp.category} 
                    date={new Date(exp.date).toLocaleDateString()} 
                    amount={exp.amount} 
                    status={exp.status} 
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center opacity-30 italic text-xs">
                    No operational outflows recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Record <span className="text-slate-600">Overhead</span></h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                className="w-full bg-muted/50 p-3 rounded-xl outline-none border border-border" 
                placeholder="Item Name (e.g. AWS)" 
                required
                onChange={(e) => setFormData({...formData, resourceName: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  className="w-full bg-muted/50 p-3 rounded-xl border border-border" 
                  placeholder="Amount" 
                  required
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
                <select 
                  className="w-full bg-muted/50 p-3 rounded-xl border border-border text-sm"
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Software">Software</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
              <button 
                disabled={isSaving}
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 
                    Processing...
                  </>
                ) : (
                  "Save Expense"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function OverheadStatCard({ label, value, sub, color, icon }: any) {
  const themes: any = {
    slate: "text-slate-500 bg-slate-500/5 border-slate-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/20",
    orange: "text-orange-500 bg-orange-500/5 border-orange-500/20"
  };

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex justify-between items-start group hover:border-foreground/10 transition-all">
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">{label}</p>
        <p className={`text-3xl font-black font-mono tracking-tighter italic ${themes[color].split(' ')[0]}`}>{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl ${themes[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function ExpenseRow({ name, category, date, amount, status }: any) {
  const isPaid = status === "Paid";
  return (
    <tr className="group hover:bg-muted/10 transition-colors">
      <td className="p-8">
        <p className="font-black text-sm uppercase tracking-tight italic text-foreground font-sans">{name}</p>
      </td>
      <td className="p-8">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-1 bg-muted rounded-lg">
          {category}
        </span>
      </td>
      <td className="p-8 text-muted-foreground font-bold">{date}</td>
      <td className="p-8 text-rose-500 font-black">-{amount}</td>
      <td className="p-8 text-right">
        <div className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic ${
          isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
        }`}>
          {status}
        </div>
      </td>
    </tr>
  );
}

function UpcomingBill({ name, amount, date }: any) {
  return (
    <div className="flex justify-between items-center p-4 bg-muted/30 rounded-2xl border border-border/50">
      <div>
        <p className="text-[9px] font-black uppercase tracking-tight italic">{name}</p>
        <p className="text-[8px] font-bold text-muted-foreground uppercase">{date}</p>
      </div>
      <p className="font-mono font-black text-xs text-rose-600">-{amount}</p>
    </div>
  );
}