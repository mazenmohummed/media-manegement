"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  Mail, 
  Phone, 
  FileText, 
  MoreHorizontal, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Briefcase
} from "lucide-react";

type VendorCategory = {
  id: string;
  name: string;
  description?: string;
  color?: string;
};

type Vendor = {
  id: string;
  vendorNo?: string;
  name: string;
  category?: VendorCategory | null; // Updated to match the relational object structure
  categoryId?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  paymentTerms: string;
  taxNumber?: string;
  email?: string;
  phoneNumber?: string;
  address?: {
    city?: string;
    country?: string;
  };
};

export default function VendorsDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const agencyId = session?.user?.agencyId;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const fetchVendors = async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ agencyId });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("categoryId", categoryFilter); // Filter by categoryId instead of text

      const res = await fetch(`/api/vendors?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setVendors(data);
        
        // Extract unique category objects safely for the filter dropdown
        const uniqueCatMap = new Map();
        data.forEach((v: Vendor) => {
          if (v.category && v.category.id) {
            uniqueCatMap.set(v.category.id, v.category);
          }
        });
        setCategories(Array.from(uniqueCatMap.values()));
      }
    } catch (err) {
      console.error("Failed to load vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [agencyId, search, statusFilter, categoryFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground">
            Vendor Directory
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Manage agency suppliers, billing terms, and external partners
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/vendors/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          <Plus size={16} />
          Add New Vendor
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-3xl border border-border">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or vendor #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-2xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-blue-600 transition-colors uppercase tracking-widest text-foreground"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLACKLISTED">Blacklisted</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-background border border-border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-blue-600 transition-colors uppercase tracking-widest text-foreground"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* VENDORS TABLE / GRID CONTENT */}
      <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Vendor Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Payment Terms</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tax Number</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                    Loading directory...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    No vendors registered matching parameters.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr 
                    key={vendor.id} 
                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-600/20 flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-foreground">{vendor.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{vendor.email || vendor.phoneNumber || "No contact info"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-muted-foreground uppercase">
                      {/* Safely render category name instead of rendering the category object */}
                      {vendor.category?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-[9px] font-black uppercase tracking-widest rounded-full ${
                        vendor.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        vendor.status === 'INACTIVE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black uppercase tracking-wider text-foreground">
                      {vendor.paymentTerms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-muted-foreground">
                      {vendor.taxNumber || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                        className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}