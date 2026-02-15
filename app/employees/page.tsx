"use client";

import React, { useState } from "react";

interface Employee {
  id: number;
  name: string;
  role: string;
  specialization: string[];
  email: string;
  status: "Available" | "Busy" | "On Leave";
}

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([
    { 
      id: 1, 
      name: "Ahmed Hassan", 
      role: "Senior Designer", 
      specialization: ["Design", "Content preparation"], 
      email: "ahmed@agency.com", 
      status: "Available" 
    },
    { 
      id: 2, 
      name: "Sara Jones", 
      role: "Videographer", 
      specialization: ["Reals", "Photo"], 
      email: "sara@agency.com", 
      status: "Busy" 
    },
  ]);

  const [newEmployee, setNewEmployee] = useState({ 
    name: "", 
    role: "", 
    email: "", 
    specialization: [] as string[] 
  });

  const roles = ["Designer", "Photographer", "Editor", "Copywriter", "Consultant", "Account Manager"];
  const services = ["Reals", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation", "Consultation"];

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const employeeToAdd: Employee = {
      id: Date.now(),
      ...newEmployee,
      status: "Available",
    };
  
    setEmployees([...employees, employeeToAdd]);
    setShowForm(false);
    setNewEmployee({ name: "", role: "", email: "", specialization: [] });
  };

  const toggleSpecialization = (service: string) => {
    setNewEmployee(prev => ({
      ...prev,
      specialization: prev.specialization.includes(service)
        ? prev.specialization.filter(s => s !== service)
        : [...prev.specialization, service]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Team Management</h1>
          <p className="text-gray-500">Assign roles and track employee availability</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
        >
          + Add Employee
        </button>
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Team Member</h2>
            <form onSubmit={handleAddEmployee} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" required className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 ring-indigo-500 outline-none" 
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Primary Role</label>
                  <select 
                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none"
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                  >
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" required className="w-full p-3 border rounded-xl bg-gray-50 outline-none" 
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Skills / Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {services.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => toggleSpecialization(s)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        newEmployee.specialization.includes(s) 
                        ? "bg-indigo-100 border-indigo-500 text-indigo-700" 
                        : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 border rounded-xl font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl">
                {emp.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                emp.status === "Available" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {emp.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{emp.name}</h3>
            <p className="text-sm text-indigo-600 font-medium mb-4">{emp.role}</p>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {emp.specialization.map(spec => (
                  <span key={spec} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    {spec}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 border-t pt-3">{emp.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}