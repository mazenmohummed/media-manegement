// app/dashboard/vendors/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  Building2,
  Search,
  Plus,
  Mail,
  Phone,
  FileText,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Briefcase,
  ClipboardList,
  TrendingUp,
  DollarSign,
  Package,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProcurementChainWidget } from "@/components/procurement/ProcurementChainWidget";

interface VendorWithProcurement {
  id: string;
  vendorNo: string | null;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  paymentTerms: string;
  taxNumber: string | null;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  address: {
    city: string | null;
    country: string | null;
  } | null;
  _count: {
    purchaseOrders: number;
    quotations: number;
    plannedPurchaseOrders: number;
  };
  averageRating: number | null;
  reviewCount: number;
}

export default async function VendorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;

  // ─── Fetch vendors with their procurement activity ──────────────────────────

  const vendors = await db.vendor.findMany({
    where: { agencyId },
    select: {
      id: true,
      vendorNo: true,
      name: true,
      email: true,
      phoneNumber: true,
      status: true,
      paymentTerms: true,
      taxNumber: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      address: {
        select: {
          city: true,
          country: true,
        },
      },
      averageRating: true,
      reviewCount: true,
      _count: {
        select: {
          purchaseOrders: true,
          quotations: true,
          plannedPurchaseOrders: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // ─── Get task IDs with procurement activity for this agency ─────────────────
  // Since Vendor doesn't have a direct tasks relation, fetch tasks with 
  // procurement activity from the Task model directly
  const procurementTasks = await db.task.findMany({
    where: {
      agencyId,
      OR: [
        { plannedExpenses: { some: {} } },
        { quotations: { some: {} } },
      ],
    },
    select: { id: true },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  const taskIds = procurementTasks.map((t) => t.id);

  // ─── Calculate vendor metrics ───────────────────────────────────────────────

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.status === 'ACTIVE').length;
  const totalPurchaseOrders = vendors.reduce((sum, v) => sum + v._count.purchaseOrders, 0);
  const totalQuotations = vendors.reduce((sum, v) => sum + v._count.quotations, 0);
  
  // Calculate average rating safely
  const vendorsWithRating = vendors.filter(v => v.averageRating !== null);
  const averageRating = vendorsWithRating.length > 0 
    ? vendorsWithRating.reduce((sum, v) => sum + (v.averageRating || 0), 0) / vendorsWithRating.length
    : 0;

  const vendorsWithReviews = vendors.filter(v => v.reviewCount > 0).length;

  // ─── Status Badge Helper ────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'INACTIVE':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'BLACKLISTED':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground">
              Vendor Directory
            </h1>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Manage agency suppliers, billing terms, and external partners
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/vendors/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add New Vendor
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Vendor Metrics Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total Vendors
              </p>
              <p className="text-3xl font-black text-foreground">{totalVendors}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {activeVendors} active
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Purchase Orders
              </p>
              <p className="text-3xl font-black text-foreground">{totalPurchaseOrders}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Across all vendors
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Quotations
              </p>
              <p className="text-3xl font-black text-foreground">{totalQuotations}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Total requests
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Avg. Rating
              </p>
              <p className="text-3xl font-black text-foreground">
                {averageRating.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {vendorsWithReviews} vendors with reviews
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── Vendor Table ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Vendor Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Payment Terms
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Orders
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      No vendors registered.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="hover:bg-muted/10 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/dashboard/vendors/${vendor.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-600/20 flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-foreground">{vendor.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {vendor.email || vendor.phoneNumber || "No contact info"}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.category ? (
                          <span
                            className="text-xs font-bold uppercase px-2 py-1 rounded-lg"
                            style={{
                              backgroundColor: `${vendor.category.color || '#6366F1'}20`,
                              color: vendor.category.color || '#6366F1',
                              border: `1px solid ${vendor.category.color || '#6366F1'}40`,
                            }}
                          >
                            {vendor.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-[9px] font-black uppercase tracking-widest rounded-full ${getStatusBadge(vendor.status)}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black uppercase tracking-wider text-foreground">
                        {vendor.paymentTerms}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-emerald-500">{vendor._count.purchaseOrders}</span>
                          <span className="text-muted-foreground">PO</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-bold text-purple-500">{vendor._count.quotations}</span>
                          <span className="text-muted-foreground">QT</span>
                          {vendor.reviewCount > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="font-bold">{vendor.averageRating?.toFixed(1)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/dashboard/vendors/${vendor.id}`}
                          className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors inline-flex"
                          title="View Details"
                        >
                          <MoreHorizontal size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Procurement Chain Widget */}
          {taskIds.length > 0 ? (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5">
                <ProcurementChainWidget taskIds={taskIds.slice(0, 10)} />
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-6 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                No Procurement Activity
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                No active procurement chains found.
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-3xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
              Vendor Quick Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active</span>
                <span className="font-bold text-emerald-500">{activeVendors}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Inactive</span>
                <span className="font-bold text-amber-500">{vendors.filter(v => v.status === 'INACTIVE').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Blacklisted</span>
                <span className="font-bold text-rose-500">{vendors.filter(v => v.status === 'BLACKLISTED').length}</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">With Reviews</span>
                <span className="font-bold">{vendorsWithReviews}</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          {vendors.some(v => v.category) && (
            <div className="bg-card border border-border rounded-3xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Map(vendors.filter(v => v.category).map(v => [v.category!.id, v.category!])).values())
                  .slice(0, 8)
                  .map((category) => (
                    <span
                      key={category.id}
                      className="text-[9px] font-black uppercase px-2 py-1 rounded-lg"
                      style={{
                        backgroundColor: `${category.color || '#6366F1'}20`,
                        color: category.color || '#6366F1',
                        border: `1px solid ${category.color || '#6366F1'}40`,
                      }}
                    >
                      {category.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}