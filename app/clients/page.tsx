"use client";

import Link from "next/link";
import React, { useState } from "react";

interface Client {
  id: number;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  status: "Active" | "Paused" | "Lead"; // Updated Statuses
  type: "Retainer" | "One-off";        // Added Project Type
  monthlyValue: number;                // Added Revenue tracking
}

export default function ClientsPage() {
  const [newClient, setNewClient] = useState({
  name: "",
  industry: "",
  contactPerson: "",
  email: "",
  type: "Retainer" as "Retainer" | "One-off",
  monthlyValue: 0
});

const handleAddClient = (e: React.FormEvent) => {
  e.preventDefault();
  const client: Client = {
    id: Date.now(),
    ...newClient,
    status: "Active" // Default new clients to active
  };
  setClients([...clients, client]);
  setShowForm(false);
  // Reset form
  setNewClient({ name: "", industry: "", contactPerson: "", email: "", type: "Retainer", monthlyValue: 0 });
};
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([
    { id: 1, name: "Mario's Italian", industry: "Restaurant", contactPerson: "Mario Rossi", email: "mario@pizza.com", status: "Active", type: "Retainer", monthlyValue: 1500 },
    { id: 2, name: "Skyline Gym", industry: "Fitness", contactPerson: "Sarah J.", email: "contact@skyline.com", status: "Active", type: "One-off", monthlyValue: 500 },
  ]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ... (handleAddClient remains similar but with added fields)

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Portfolio</h1>
          <p className="text-muted-foreground">Monitor high-value accounts and content subscriptions</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="p-2 border rounded-lg text-sm flex-grow md:w-64 bg-card"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            + New Client
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW (Quick Visual for Agency Owners) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-4 border rounded-xl shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase">Active Retainers</p>
          <p className="text-2xl font-bold">
            {clients.filter(c => c.type === "Retainer").length}
          </p>
        </div>
        <div className="bg-card p-4 border rounded-xl shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase">Monthly Recurring Revenue (MRR)</p>
          <p className="text-2xl font-bold text-blue-600">
            ${clients.reduce((acc, curr) => acc + curr.monthlyValue, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-4 font-semibold text-xs uppercase text-muted-foreground">Client Information</th>
              <th className="p-4 font-semibold text-xs uppercase text-muted-foreground">Account Type</th>
              <th className="p-4 font-semibold text-xs uppercase text-muted-foreground">Monthly Value</th>
              <th className="p-4 font-semibold text-xs uppercase text-muted-foreground">Status</th>
              <th className="p-4 font-semibold text-xs uppercase text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-foreground">{client.name}</div>
                  <div className="text-xs text-muted-foreground">{client.industry} • {client.contactPerson}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    client.type === "Retainer" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {client.type}
                  </span>
                </td>
                <td className="p-4 font-mono font-medium text-sm">
                  ${client.monthlyValue.toLocaleString()}
                </td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {client.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Link href={"/clients/clent-details"}>
                  <button className="text-blue-600 hover:underline text-sm font-semibold" >
                    Manage Assets
                  </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop */}
    <div 
      className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      onClick={() => setShowForm(false)} 
    />
    
    {/* Modal Card */}
    <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Onboard New Client</h2>
          <p className="text-xs text-gray-500">Add account details and revenue expectations</p>
        </div>
        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <form onSubmit={handleAddClient} className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Company Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Global Tech Inc."
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setNewClient({...newClient, name: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Industry</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Real Estate"
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Contact Person</label>
            <input 
              required
              type="text" 
              placeholder="e.g. John Doe"
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setNewClient({...newClient, contactPerson: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Account Type</label>
            <select 
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              onChange={(e) => setNewClient({...newClient, type: e.target.value as any})}
            >
              <option value="Retainer">Retainer (Monthly)</option>
              <option value="One-off">One-off (Project)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Contract Value ($)</label>
            <input 
              required
              type="number" 
              placeholder="2500"
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setNewClient({...newClient, monthlyValue: Number(e.target.value)})}
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
          <input 
            required
            type="email" 
            placeholder="client@company.com"
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setNewClient({...newClient, email: e.target.value})}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
          >
            Create Account
          </button>
        </div>
      </form>
    </div>
  </div>
      )}
    </div>
  );
}