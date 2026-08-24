"use client";

import { useState, useTransition } from "react";
import { X, FileText, Building2, Search, Check, ChevronDown } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  projectNo: string | null;
}

interface QuotationData {
  id: string;
  quotationNo: string | null;
  status: string;
  vendorId: string | null;
  vendors?: { vendorId: string; vendor: { id: string; name: string } }[];
  projectId: string | null;
  project?: { id: string; name: string; projectNo: string | null } | null;
  validUntil: Date | string | null;
  description: string | null;
  notes: string | null;
  currency: string;
  amount: number | null;
  plannedAmount: number | null;
}

interface EditQuotationClientProps {
  agencyId: string;
  quotation: QuotationData;
  vendors: Vendor[];
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  updateQuotationAction: (formData: FormData) => Promise<void>;
}

export default function EditQuotationClient({
  agencyId,
  quotation,
  vendors = [],
  projects = [],
  isOpen,
  onClose,
  updateQuotationAction,
}: EditQuotationClientProps) {
  if (!isOpen) return null;

  const initialVendorIds = quotation.vendors && quotation.vendors.length > 0
    ? quotation.vendors.map((v) => v.vendorId)
    : quotation.vendorId
    ? [quotation.vendorId]
    : [];

  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(initialVendorIds);
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);

  const initialProject = projects.find((p) => p.id === quotation.projectId);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(quotation.projectId || "");
  const [selectedProjectName, setSelectedProjectName] = useState(
    initialProject
      ? `${initialProject.name} ${initialProject.projectNo ? `(${initialProject.projectNo})` : ""}`
      : "None (General procurement)"
  );
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const filteredVendors = (vendors || [])
    .filter((v) => v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
    .slice(0, 5);

  const filteredProjects = (projects || [])
    .filter((p) => 
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
      (p.projectNo && p.projectNo.toLowerCase().includes(projectSearch.toLowerCase()))
    )
    .slice(0, 5);

  const toggleVendorSelection = (id: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const formattedValidUntil = quotation.validUntil
    ? new Date(quotation.validUntil).toISOString().split("T")[0]
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> Edit Vendor Quotation
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Update cost estimates, price requests, vendor assignments, or project links.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          action={async (formData) => {
            selectedVendorIds.forEach((vId) => formData.append("vendorIds", vId));
            formData.set("projectId", selectedProjectId);
            
            startTransition(async () => {
              await updateQuotationAction(formData);
              onClose();
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
              <select
                name="status"
                defaultValue={quotation.status || "REQUESTED"}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="REQUESTED">Requested</option>
                <option value="RECEIVED">Received</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          {/* Vendors Searchable Dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-400" /> Vendors <span className="text-rose-500">*</span>
            </label>
            
            <div
              onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-zinc-300">
                {selectedVendorIds.length === 0
                  ? "Select vendors..."
                  : `${selectedVendorIds.length} vendor(s) selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </div>

            {isVendorDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search vendors (showing max 5)..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredVendors.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-2 text-center">No vendors match your search.</p>
                  ) : (
                    filteredVendors.map((vendor) => {
                      const isSelected = selectedVendorIds.includes(vendor.id);
                      return (
                        <div
                          key={vendor.id}
                          onClick={() => toggleVendorSelection(vendor.id)}
                          className={`flex items-center justify-between text-sm px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-950/40 text-purple-200" : "text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          <span>{vendor.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Linked Project Searchable Dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-300 mb-1">Linked Project</label>
            
            <div
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-zinc-300">{selectedProjectName}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </div>

            {isProjectDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search projects (showing max 5)..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  <div
                    onClick={() => {
                      setSelectedProjectId("");
                      setSelectedProjectName("None (General procurement)");
                      setIsProjectDropdownOpen(false);
                    }}
                    className="text-sm px-2 py-1.5 rounded cursor-pointer text-zinc-400 hover:bg-zinc-900"
                  >
                    None (General procurement)
                  </div>
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setSelectedProjectName(`${project.name} ${project.projectNo ? `(${project.projectNo})` : ""}`);
                        setIsProjectDropdownOpen(false);
                      }}
                      className="text-sm px-2 py-1.5 rounded cursor-pointer text-zinc-300 hover:bg-zinc-900"
                    >
                      {project.name} {project.projectNo ? `(${project.projectNo})` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              defaultValue={formattedValidUntil}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description / Scope of Work</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={quotation.description || ""}
              placeholder="Itemized quotation summary or scope details..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Internal Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={quotation.notes || ""}
              placeholder="Internal remarks or payment term conditions..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Update Quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}