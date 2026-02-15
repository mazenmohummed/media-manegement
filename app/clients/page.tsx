"use client";

import React, { useState } from "react";

interface Client {
  id: number;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  status: "Active" | "Inactive";
}

export default function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([
    { id: 1, name: "Mario's Italian", industry: "Restaurant", contactPerson: "Mario Rossi", email: "mario@pizza.com", status: "Active" },
    { id: 2, name: "Skyline Gym", industry: "Fitness", contactPerson: "Sarah J.", email: "contact@skyline.com", status: "Active" },
  ]);

  const [newClient, setNewClient] = useState({ name: "", industry: "", contactPerson: "", email: "" });

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const clientToAdd: Client = {
      id: Date.now(),
      ...newClient,
      status: "Active",
    };
    setClients([...clients, clientToAdd]);
    setShowForm(false);
    setNewClient({ name: "", industry: "", contactPerson: "", email: "" });
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold ">Client Directory</h1>
          <p className="">Manage your marketing agency's client relationships</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <span>+</span> Add New Client
        </button>
      </div>

      {/* Add Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Register New Client</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium ">Company Name</label>
                <input 
                  type="text" required className="w-full p-2 border rounded-md" 
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  placeholder="e.g. The Burger Joint"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={newClient.industry}
                  onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
                >
                  <option value="">Select Industry</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <input 
                  type="text" className="w-full p-2 border rounded-md" 
                  value={newClient.contactPerson}
                  onChange={(e) => setNewClient({...newClient, contactPerson: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input 
                  type="email" className="w-full p-2 border rounded-md" 
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-semibold text-gray-600">Company</th>
              <th className="p-4 font-semibold text-gray-600">Industry</th>
              <th className="p-4 font-semibold text-gray-600">Contact</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                <td className="p-4 font-medium text-gray-900">{client.name}</td>
                <td className="p-4 text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{client.industry}</span>
                </td>
                <td className="p-4">
                  <div className="text-sm text-gray-900">{client.contactPerson}</div>
                  <div className="text-xs text-gray-500">{client.email}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {client.status}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Projects</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}