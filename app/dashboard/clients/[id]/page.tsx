"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Terminal, 
  Activity, 
  DollarSign, 
  Briefcase, 
  ArrowLeft,
  Loader2,
  Edit3,
  PlusCircle,
  X
} from "lucide-react";
import Link from "next/link";



export default function ClientTerminal() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);

  // Form States
  const [editData, setEditData] = useState({ clientName: "", accountType: "", status: "" });
  const [paymentData, setPaymentData] = useState({ amount: "", method: "Cash", datePaid: new Date().toISOString().split('T')[0] });

  const fetchClientData = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const data = await res.json();
      setClient(data);
    } catch (err) {
      console.error("Failed to load client", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        // 1. Close the modal immediately
        setShowEditModal(false);
        
        // 2. Refresh the data to show the new Name/Status on the page
        fetchClientData();
      } else {
        const errorData = await res.json();
        alert(`Update failed: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Network error during update:", err);
      alert("Failed to connect to the server. Please try again.");
    } finally {
      setIsUpdating(false); // Stop Loading
    }
  };

 const handleRecordPayment = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation: Ensure amount is valid before sending
  if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
    alert("Please enter a valid payment amount.");
    return;
  }

  setIsRecording(true);
  try {
    const res = await fetch(`/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        amount: parseFloat(paymentData.amount), // Ensure number type
        method: paymentData.method,
        datePaid: new Date(paymentData.datePaid).toISOString(), // Format for Prisma
        clientId: id, 
        description: `Payment from ${client.clientName}` // Optional: Add a default description
      }),
    });

    if (res.ok) {
      // 1. Close Modal
      setShowPaymentModal(false);
      
      // 2. Reset Form
      setPaymentData({ 
        amount: "", 
        method: "Bank Transfer", 
        datePaid: new Date().toISOString().split('T')[0] 
      });

      // 3. Refresh Data - This updates the StatCards and the Ledger list automatically
      await fetchClientData(); 
      
      // Optional: Add a simple success feedback
      console.log("Ledger updated successfully.");
    } else {
      const errorData = await res.json();
      alert(`Transaction Failed: ${errorData.error || "Unknown Error"}`);
    }
  } catch (err) {
    console.error("Connection error:", err);
    alert("Failed to connect to the terminal server.");
  } finally {
    setIsRecording(false);
  }
};
  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!client || client.error) return <div className="p-10 text-white font-black uppercase">Entity Not Found in Database.</div>;

  const totalInvoiced = client.projects?.reduce((acc: number, p: any) => acc + (p.totalValue || 0), 0) || 0;
  const totalPaid = client.payments?.reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4">
      {/* NAVIGATION & ACTIONS */}
      <div className="flex justify-between items-center">
        <Link href="/dashboard/clients" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-blue-600 transition-colors">
          <ArrowLeft size={14} /> Back to Command Center
        </Link>
        <div className="flex gap-2">
           <button 
            onClick={() => {
                // Populate the form with current data before opening
                setEditData({ 
                clientName: client.clientName, 
                accountType: client.accountType, 
                status: client.status 
                });
                setShowEditModal(true);
            }} 
            className="flex items-center gap-2 bg-card hover:bg-muted text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-border"
            >
            <Edit3 size={14} /> Edit Entity
            </button>
          <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all">
            <PlusCircle size={14} /> Record Payment
          </button>
        </div>
      </div>

      {/* HEADER BLOCK */}
      <div className="bg-card border border-border p-8 rounded-[2.5rem] flex flex-col md:row justify-between items-start md:items-end gap-6 shadow-2xl shadow-blue-900/5">
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Terminal Session: {client.status}</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-foreground leading-tight">
            {client.clientName || "Unknown Entity"}
          </h1>
          {/* FIX: Explicitly check for id existence */}
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest bg-muted/50 w-fit px-3 py-1 rounded-lg border border-border">
            CLIENT_NO: {client.clientNo || "NOT_ASSIGNED"}
          </p>
        </div>
        
        <div className="bg-blue-600/5 border border-blue-600/10 p-4 rounded-2xl min-w-[200px]">
          <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Account Classification</p>
          {/* FIX: Explicitly check for accountType */}
          <p className="text-xl font-black italic uppercase text-blue-600">
            {client.accountType ? client.accountType : "N/A"}
          </p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Contract Value" value={`$${totalInvoiced.toLocaleString()}`} icon={<Briefcase />} color="blue" />
        <StatCard label="Revenue Collected" value={`$${totalPaid.toLocaleString()}`} icon={<DollarSign />} color="emerald" />
        <StatCard label="Outstanding Debt" value={`$${(totalInvoiced - totalPaid).toLocaleString()}`} icon={<Activity />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* PROJECTS LIST */}
        <div className="bg-card border rounded-[2rem] p-8 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 border-b border-border pb-4">
            <Terminal size={18} className="text-blue-600" /> Active Deployments
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {client.projects?.length > 0 ? client.projects.map((project: any) => (
              <div 
                key={project.id} 
                onClick={() => router.push(`/dashboard/projects/${project.id}`)} // ADD REDIRECT
                className="p-5 border rounded-3xl bg-muted/20 hover:bg-muted/40 transition-all group border-border/50 cursor-pointer flex justify-between items-center"
              >
                <div className="flex justify-between items-start w-full">
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-sm group-hover:text-blue-600 transition-colors">
                      {project.projectName}
                    </h3>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1 tracking-widest">
                      Status: {project.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black italic text-sm text-foreground">
                      ${(project.totalValue || 0).toLocaleString()}
                    </p>
                    {/* Visual indicator for clickability */}
                    <span className="text-muted-foreground/30 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                      <ArrowLeft size={14} className="rotate-180" />
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 opacity-50 uppercase text-[10px] font-black tracking-widest italic">
                No Projects Initialized
              </div>
            )}
          </div>
        </div>

       {/* PAYMENT HISTORY */}
        <div className="bg-card border rounded-[2rem] p-8 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 border-b border-border pb-4">
            <DollarSign size={18} className="text-emerald-600" /> Ledger Transactions
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {client.payments?.length > 0 ? client.payments.map((payment: any) => (
              <div 
                key={payment.id} 
                onClick={() => router.push(`/dashboard/finance/payments/${payment.id}`)} // ADD REDIRECT
                className="flex justify-between items-center p-4 border-b border-border border-dashed hover:bg-emerald-600/5 transition-all rounded-xl cursor-pointer group"
              >
                <div className="space-y-1">
                  {/* DISPLAY PAYMENT NUMBER */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-emerald-600/10 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-600/10 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {payment.paymentNo || "TRX-REF"}
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-wider">{payment.method || "Transfer"}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold">{new Date(payment.datePaid).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-emerald-600 tracking-tighter text-lg">+ ${(payment.amount || 0).toLocaleString()}</p>
                  {/* Subtle arrow to indicate clickability */}
                  <span className="text-muted-foreground/30 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                    <ArrowLeft size={14} className="rotate-180" />
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 opacity-50 uppercase text-[10px] font-black tracking-widest italic">Zero Inbound Cashflow</div>
            )}
          </div>
        </div>

        {/* PAYMENT MODAL */}
        {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <form onSubmit={handleRecordPayment} className="bg-card border w-full max-w-md p-8 rounded-[2rem] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">New Transaction</h2>
              <X className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setShowPaymentModal(false)} />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Deposit Amount</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-muted p-4 rounded-xl outline-none border border-border font-black text-lg focus:border-emerald-600 transition-all" 
                  value={paymentData.amount} 
                  onChange={e => setPaymentData({...paymentData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payment Channel</label>
                <select 
                  className="w-full bg-muted p-4 rounded-xl outline-none border border-border font-bold appearance-none cursor-pointer"
                  value={paymentData.method}
                  onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="InstaPay">InstaPay</option>
                  <option value="Stripe">Stripe / Card</option>
                </select>
              </div>
            </div>

            <button 
              disabled={isRecording}
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-black uppercase py-5 rounded-2xl tracking-widest flex items-center justify-center gap-2 mt-4 transition-all"
            >
              {isRecording ? <Loader2 className="animate-spin" size={18} /> : "Authorize Payment"}
            </button>
          </form>
        </div>
        )}

        {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <form onSubmit={handleUpdateClient} className="bg-card border w-full max-w-md p-8 rounded-[2rem] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="font-black uppercase italic tracking-tighter">Edit Entity</h2>
              <X className="cursor-pointer" onClick={() => setShowEditModal(false)} />
            </div>
            <input 
              className="w-full bg-muted p-4 rounded-xl outline-none border border-border" 
              value={editData.clientName} 
              onChange={e => setEditData({...editData, clientName: e.target.value})}
              placeholder="Client Name"
            />
            <select 
              className="w-full bg-muted p-4 rounded-xl outline-none border border-border"
              value={editData.accountType}
              onChange={e => setEditData({...editData, accountType: e.target.value})}
            >
              <option value="Retainer">Retainer</option>
              <option value="One-off">One-off</option>
            </select>
            <select 
            className="w-full bg-muted p-4 rounded-xl outline-none border border-border"
            value={editData.status}
            onChange={e => setEditData({...editData, status: e.target.value})}
            >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            </select>

           <button 
              disabled={isUpdating}
              type="submit" 
              className="w-full bg-blue-600 disabled:bg-blue-400 text-white font-black uppercase py-4 rounded-xl tracking-widest flex items-center justify-center gap-2"
            >
              {isUpdating ? <Loader2 className="animate-spin" size={18} /> : "Update Record"}
            </button>
          </form>
        </div>
      )}


      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-600/10 border-blue-600/20",
    emerald: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
    amber: "text-amber-600 bg-amber-600/10 border-amber-600/20",
  };
  return (
    <div className={`bg-card p-6 border rounded-[2rem] flex items-center gap-4 shadow-sm ${colors[color].split(' ')[2]}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black italic tracking-tighter">{value}</p>
      </div>
    </div>
  );
}