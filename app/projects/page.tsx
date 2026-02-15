"use client";

import React, { useState } from "react";

const SERVICE_TYPES = [
  "Consultation", "Reals", "Photo", "Design", "Sponsor", "Copy Writer", "Content preparation"
];

interface ServiceDetail {
  employee: string;
  startDate: string; // Added
  endDate: string;   // Added
  isFreelancer: boolean;
  salary: string;
}

interface Project {
  id: number;
  projectName: string;
  clientName: string;
  services: Record<string, ServiceDetail>;
}

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedServices, setSelectedServices] = useState<Record<string, ServiceDetail>>({});
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) => {
      const newServices = { ...prev };
      if (newServices[service]) {
        delete newServices[service];
      } else {
        // Initialize with startDate and endDate
        newServices[service] = { 
          employee: "", 
          startDate: "", 
          endDate: "", 
          isFreelancer: false, 
          salary: "" 
        };
      }
      return newServices;
    });
  };

  const updateServiceDetail = (service: string, field: keyof ServiceDetail, value: any) => {
    setSelectedServices((prev) => ({
      ...prev,
      [service]: { ...prev[service], [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: Date.now(),
      projectName,
      clientName,
      services: { ...selectedServices },
    };
    
    setProjectsList([newProject, ...projectsList]);
    alert("Project added to table!");
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Project Management</h1>

      <div className="grid grid-cols-1 gap-12">
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-blue-600">Create New Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded-md" 
                onChange={(e) => setProjectName(e.target.value)}
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded-md" 
                onChange={(e) => setClientName(e.target.value)}
                required 
              />
            </div>
          </div>

          <hr />

          {/* Service Selection */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wider">Select Services</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`px-4 py-1.5 rounded-full border text-sm transition-all ${
                    selectedServices[service] 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {selectedServices[service] ? "✓ " : "+ "} {service}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Service Configuration */}
          <div className="space-y-3">
            {Object.keys(selectedServices).map((service) => (
              <div key={service} className="p-4 bg-white border-l-4 border-l-blue-500 rounded-r-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="w-full md:w-28">
                  <span className="font-bold text-gray-800 text-sm">{service}</span>
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <input 
                    type="text" 
                    placeholder="Assignee"
                    className="w-full p-2 text-sm border rounded"
                    onChange={(e) => updateServiceDetail(service, "employee", e.target.value)}
                  />
                </div>

                {/* Date Range Inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-400 uppercase">Start Date</label>
                    <input 
                      type="date" 
                      className="p-1.5 text-xs border rounded"
                      onChange={(e) => updateServiceDetail(service, "startDate", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-400 uppercase">End Date</label>
                    <input 
                      type="date" 
                      className="p-1.5 text-xs border rounded"
                      onChange={(e) => updateServiceDetail(service, "endDate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id={`free-${service}`}
                    className="w-4 h-4 text-blue-600"
                    onChange={(e) => updateServiceDetail(service, "isFreelancer", e.target.checked)}
                  />
                  <label htmlFor={`free-${service}`} className="text-xs font-medium text-gray-600">Freelancer</label>
                </div>

                {selectedServices[service].isFreelancer && (
                  <div className="w-full md:w-24">
                    <input 
                      type="number" 
                      placeholder="Salary"
                      className="w-full p-2 text-sm border border-green-300 rounded bg-green-50"
                      onChange={(e) => updateServiceDetail(service, "salary", e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-shadow shadow-md mt-4"
          >
            Add Project to List
          </button>
        </form>

        {/* --- PROJECTS TABLE --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">Existing Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                  <th className="p-4 border-b">Project / Client</th>
                  <th className="p-4 border-b">Services, Timeline & Assignees</th>
                  <th className="p-4 border-b">Total Freelance Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projectsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 italic">No projects added yet.</td>
                  </tr>
                )}
                {projectsList.map((project) => {
                  const freelanceTotal = Object.values(project.services).reduce(
                    (sum, s) => sum + (Number(s.salary) || 0), 0
                  );
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-bold text-gray-800">{project.projectName}</div>
                        <div className="text-sm text-gray-500">{project.clientName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(project.services).map(([name, detail]) => (
                            <span key={name} className="inline-flex flex-col px-3 py-2 rounded bg-blue-50 border border-blue-100 min-w-[140px]">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">{name}</span>
                              <span className="text-xs font-semibold text-gray-800">{detail.employee || "Unassigned"}</span>
                              <span className="text-[9px] text-gray-500 mt-1">
                                {detail.startDate || '??'} → {detail.endDate || '??'}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`font-mono font-bold ${freelanceTotal > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          ${freelanceTotal.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}