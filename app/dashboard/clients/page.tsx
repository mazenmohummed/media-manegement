"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State matching Prisma Schema
  const [formData, setFormData] = useState({
    clientName: "",
    accountType: "Retainer",
    status: "Active",
  });

useEffect(() => {
  if (status === "authenticated" && session?.user?.agencyId) {
    fetchClients(session.user.agencyId);
  } else if (status === "unauthenticated") {
    setLoading(false); // Stop loading if not logged in
  }
}, [status, session]);

const fetchClients = async (agencyId: string) => {
    try {
      const res = await fetch(`/api/clients?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.agencyId) return alert("Session lost. Please refresh.");

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        agencyId: session.user.agencyId, // Dynamic ID from the secure session
      }),
    });

    if (res.ok) {
      fetchClients(session.user.agencyId);
      setShowForm(false);
      setFormData({ ...formData, clientName: "" });
    }
  };

  // Auth Guard: Prevents UI flicker or unauthorized access
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Terminal...</p>
      </div>
    );
  }

const filteredClients = clients.filter((c: any) =>
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">Client Portfolio</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage high-stakes accounts and project partners.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search command..." 
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-card text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus size={14} strokeWidth={3} /> New Account
          </button>
        </div>
      </div>

      {/* REVENUE OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 border rounded-[2rem] flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Accounts</p>
            <p className="text-2xl font-black italic">{clients.length}</p>
          </div>
        </div>
        <div className="bg-card p-6 border rounded-[2rem] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-600">
            <span className="font-black">$</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Portfolio Status</p>
            <p className="text-2xl font-black italic text-emerald-600 uppercase tracking-tighter">Healthy</p>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Name</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Account Type</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                </td>
              </tr>
            ) : filteredClients.map((client: any) => (
              <tr key={client.id} className="hover:bg-muted/10 transition-colors group">
                <td className="p-6">
                  <div className="font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">{client.clientName}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ID: {client.id.slice(-6)}</div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    client.accountType === "Retainer" ? "bg-blue-600/10 border-blue-600/20 text-blue-600" : "bg-amber-600/10 border-amber-600/20 text-amber-600"
                  }`}>
                    {client.accountType}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {client.status}
                  </div>
                </td>
                <td className="p-6 text-right">
                  <Link href={`/dashboard/clients/${client.id}`}>
                    <button className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-400 underline underline-offset-4">
                      Terminal View
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NEW CLIENT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form onSubmit={handleAddClient} className="relative bg-card w-full max-w-lg rounded-[2.5rem] border border-border p-10 shadow-2xl space-y-6">
            <header className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Onboard Entity</h2>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Initialize new client record in Agency OS.</p>
            </header>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Entity Name</label>
                <input 
                  required
                  className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50"
                  placeholder="e.g. Red Bull Global"
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Account Type</label>
                  <select 
                    className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none appearance-none text-xs font-bold uppercase tracking-widest"
                    onChange={(e) => setFormData({...formData, accountType: e.target.value})}
                  >
                    <option value="Retainer">Retainer</option>
                    <option value="One-off">One-off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Initial Status</label>
                  <input 
                    className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none"
                    defaultValue="Active"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-muted rounded-2xl transition-colors"
              >
                Abort
              </button>
              <button 
                type="submit"
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20"
              >
                Confirm Setup
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}