// app/dashboard/assets/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Package,
  MapPin,
  Calendar,
  Wrench,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Asset {
  id: string;
  assetNo: string | null;
  assetName: string;
  category: string;
  purchaseDate: string | null;
  currentValue: number;
  availabilityStatus: string;
  serialNumber: string | null;
  location: string | null;
  maintenanceDueAt: string | null;
  createdAt: string;
  _count?: { tasks: number };
  tasks?: { id: string; title: string | null; taskNo: string | null }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  AVAILABLE: { label: "Available", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800", icon: CheckCircle2 },
  IN_USE: { label: "In Use", color: "bg-blue-950/40 text-blue-400 border-blue-800", icon: Clock },
  MAINTENANCE: { label: "Maintenance", color: "bg-amber-950/40 text-amber-400 border-amber-800", icon: Wrench },
  RETIRED: { label: "Retired", color: "bg-zinc-700 text-zinc-300 border-zinc-600", icon: XCircle },
  LOST: { label: "Lost", color: "bg-red-950/40 text-red-400 border-red-800", icon: AlertCircle },
};

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });
      if (search) params.append("q", search);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category", categoryFilter);

      const res = await fetch(`/api/assets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAssets();
      }
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Get unique categories for filter
  const categories = [...new Set(assets.map(a => a.category))].filter(Boolean);

  if (loading && assets.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Assets</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your agency's equipment and resources
          </p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, asset number, or serial number..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3"
        >
          <option value="">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="IN_USE">In Use</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RETIRED">Retired</option>
          <option value="LOST">Lost</option>
        </select>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-zinc-100">{assets.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Available</p>
          <p className="text-lg font-bold text-emerald-400">
            {assets.filter(a => a.availabilityStatus === "AVAILABLE").length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">In Use</p>
          <p className="text-lg font-bold text-blue-400">
            {assets.filter(a => a.availabilityStatus === "IN_USE").length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Maintenance</p>
          <p className="text-lg font-bold text-amber-400">
            {assets.filter(a => a.availabilityStatus === "MAINTENANCE").length}
          </p>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/50 border-b border-zinc-800">
              <tr className="text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <Package className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                    No assets found. Add your first asset to get started.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const status = statusConfig[asset.availabilityStatus] || statusConfig.AVAILABLE;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-zinc-200">{asset.assetName}</p>
                          <p className="text-xs text-zinc-500">{asset.assetNo || asset.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{asset.category}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${status.color} text-[10px] px-2 py-0.5`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-medium">
                        {formatCurrency(asset.currentValue)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {asset.location || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {asset._count?.tasks && asset._count.tasks > 0 ? (
                          <span className="flex items-center gap-1 text-blue-400 text-xs">
                            <Users className="w-3.5 h-3.5" />
                            {asset._count.tasks} task{asset._count.tasks > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/assets/${asset.id}/edit`);
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(asset.id);
                            }}
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="border-zinc-700 text-zinc-300"
            >
              Previous
            </Button>
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="border-zinc-700 text-zinc-300"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}