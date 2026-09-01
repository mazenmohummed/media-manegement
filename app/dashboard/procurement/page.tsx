// app/dashboard/procurement/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Package,
  Building2,
  Calendar,
  PlusCircle,
  Download,
  Filter,
  Search,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProcurementChainWidget } from "@/components/procurement/ProcurementChainWidget";
import { QuotationStatus, PlannedOrderStatus, PurchaseOrderStatus } from "@prisma/client";

export default async function ProcurementDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;

  // ─── Fetch all procurement data ──────────────────────────────────────────────

  // 1. Get all tasks with procurement activity (planned expenses or quotations)
  const procurementTasks = await db.task.findMany({
    where: {
      agencyId,
      OR: [
        { plannedExpenses: { some: {} } },
        { quotations: { some: {} } },
      ],
    },
    select: {
      id: true,
      title: true,
      taskType: true,
      plannedExpenses: {
        select: {
          id: true,
          status: true,
          totalEstimated: true,
        },
      },
      quotations: {
        select: {
          id: true,
          status: true,
          amount: true,
          quotationNo: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const taskIds = procurementTasks.map((t) => t.id);

  // 2. Get all quotations with vendor and project info
  const quotations = await db.quotation.findMany({
    where: { agencyId },
    select: {
      id: true,
      quotationNo: true,
      status: true,
      amount: true,
      plannedAmount: true,
      currency: true,
      createdAt: true,
      validUntil: true,
      vendor: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      task: {
        select: { id: true, title: true },
      },
      _count: {
        select: {
          purchaseOrders: true,
          plannedOrders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 3. Get all planned purchase orders
  const plannedOrders = await db.plannedPurchaseOrder.findMany({
    where: { agencyId },
    select: {
      id: true,
      plannedPoNo: true,
      status: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      expectedDeliveryDate: true,
      quotation: {
        select: {
          id: true,
          quotationNo: true,
        },
      },
      vendors: {
        include: {
          vendor: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 4. Get all purchase orders
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: { agencyId },
    select: {
      id: true,
      poNo: true,
      status: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      expectedDeliveryDate: true,
      deliveredAt: true,
      vendor: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 5. Get vendors with procurement activity
  const activeVendors = await db.vendor.findMany({
    where: {
      agencyId,
      OR: [
        { purchaseOrders: { some: {} } },
        { quotations: { some: {} } },
        { plannedPurchaseOrders: { some: {} } },
      ],
    },
    select: {
      id: true,
      name: true,
      vendorNo: true,
      status: true,
      _count: {
        select: {
          purchaseOrders: true,
          quotations: true,
          plannedPurchaseOrders: true,
        },
      },
    },
    take: 10,
  });

  // ─── Calculate Metrics ──────────────────────────────────────────────────────

  // Quotation metrics
  const totalQuotations = quotations.length;
  const pendingQuotations = quotations.filter((q) => q.status === "REQUESTED" || q.status === "RECEIVED").length;
  const selectedQuotations = quotations.filter((q) => q.status === "SELECTED").length;
  const totalQuotationAmount = quotations.reduce((sum, q) => sum + (q.amount || 0), 0);

  // Planned order metrics
  const totalPlannedOrders = plannedOrders.length;
  const pendingApproval = plannedOrders.filter((po) => po.status === "PLANNED").length;
  const approvedPlannedOrders = plannedOrders.filter((po) => po.status === "APPROVED").length;
  const convertedPlannedOrders = plannedOrders.filter((po) => po.status === "CONVERTED").length;

  // Purchase order metrics
  const totalPurchaseOrders = purchaseOrders.length;
  const draftPOs = purchaseOrders.filter((po) => po.status === "DRAFT").length;
  const sentPOs = purchaseOrders.filter((po) => po.status === "SENT").length;
  const confirmedPOs = purchaseOrders.filter((po) => po.status === "CONFIRMED").length;
  const deliveredPOs = purchaseOrders.filter((po) => po.status === "DELIVERED").length;
  const invoicedPOs = purchaseOrders.filter((po) => po.status === "INVOICED").length;
  const cancelledPOs = purchaseOrders.filter((po) => po.status === "CANCELLED").length;
  
  const totalSpent = purchaseOrders
    .filter((po) => po.status === "DELIVERED" || po.status === "INVOICED")
    .reduce((sum, po) => sum + po.totalAmount, 0);

  // Conversion rates
  const conversionRate = totalQuotations > 0 
    ? Math.round((selectedQuotations / totalQuotations) * 100) 
    : 0;
  
  const plannedToPoRate = totalPlannedOrders > 0 
    ? Math.round((convertedPlannedOrders / totalPlannedOrders) * 100) 
    : 0;

  // ─── Status Badge Helper ────────────────────────────────────────────────────

  const getQuotationStatusBadge = (status: QuotationStatus) => {
    const map: Record<QuotationStatus, { color: string; label: string }> = {
      REQUESTED: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Requested" },
      RECEIVED: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Received" },
      COMPARED: { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Compared" },
      SELECTED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Selected" },
      REJECTED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Rejected" },
      EXPIRED: { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Expired" },
    };
    return map[status] || map.REQUESTED;
  };

  const getPlannedOrderStatusBadge = (status: PlannedOrderStatus) => {
    const map: Record<PlannedOrderStatus, { color: string; label: string }> = {
      PLANNED: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Planned" },
      APPROVED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Approved" },
      REJECTED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Rejected" },
      CONVERTED: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Converted" },
    };
    return map[status] || map.PLANNED;
  };

  const getPurchaseOrderStatusBadge = (status: PurchaseOrderStatus) => {
    const map: Record<PurchaseOrderStatus, { color: string; label: string }> = {
      DRAFT: { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Draft" },
      SENT: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Sent" },
      CONFIRMED: { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Confirmed" },
      DELIVERED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Delivered" },
      CANCELLED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Cancelled" },
      INVOICED: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Invoiced" },
    };
    return map[status] || map.DRAFT;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Procurement Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor procurement activities, quotations, and purchase orders across all projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/procurement/quotations/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          </Link>
          <Link href="/dashboard/vendors/purchase-orders/new">
            <Button variant="outline" className="border-blue-600/30 text-blue-400 hover:bg-blue-950/20">
              <Package className="w-4 h-4 mr-2" />
              New PO
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Metrics Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total Quotations
              </p>
              <p className="text-3xl font-black text-foreground">{totalQuotations}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{pendingQuotations} pending</span>
            <span className="text-xs text-emerald-500">{conversionRate}% conversion</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Planned Orders
              </p>
              <p className="text-3xl font-black text-foreground">{totalPlannedOrders}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <ClipboardList className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-amber-500">{pendingApproval} pending approval</span>
            <span className="text-xs text-emerald-500">{plannedToPoRate}% converted</span>
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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-emerald-500">{deliveredPOs} delivered</span>
            <span className="text-xs text-blue-500">{sentPOs} in progress</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total Spent
              </p>
              <p className="text-3xl font-black text-emerald-500">
                EGP {totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{totalQuotationAmount.toLocaleString()} quoted</span>
          </div>
        </div>
      </div>

      {/* ─── Active Procurement Chains ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Active Procurement Chains
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {procurementTasks.length} active chains across the agency
            </p>
          </div>
          <Link href="/dashboard/procurement/chains">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        {taskIds.length > 0 ? (
          <ProcurementChainWidget taskIds={taskIds.slice(0, 10)} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No active procurement chains</p>
            <p className="text-xs mt-1">Create planned expenses or quotations to start a procurement chain.</p>
          </div>
        )}
      </div>

      {/* ─── Two Column Layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Recent Quotations ──────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Recent Quotations
              </h3>
            </div>
            <Link href="/dashboard/procurement/quotations">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {quotations.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {quotations.slice(0, 10).map((q) => {
                const statusBadge = getQuotationStatusBadge(q.status as QuotationStatus);
                return (
                  <Link
                    key={q.id}
                    href={`/dashboard/procurement/quotations/${q.id}`}
                    className="block p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {q.quotationNo || `QT-${q.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {q.vendor?.name || "No vendor"} • {q.project?.name || q.task?.title || "No project"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                        <p className="text-xs font-bold text-foreground mt-1">
                          {q.currency} {q.amount?.toLocaleString() || "0"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm">No quotations found</p>
            </div>
          )}
        </div>

        {/* ─── Recent Purchase Orders ────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                Recent Purchase Orders
              </h3>
            </div>
            <Link href="/dashboard/vendors/purchase-orders">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {purchaseOrders.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {purchaseOrders.slice(0, 10).map((po) => {
                const statusBadge = getPurchaseOrderStatusBadge(po.status as PurchaseOrderStatus);
                return (
                  <Link
                    key={po.id}
                    href={`/dashboard/vendors/purchase-orders/${po.id}`}
                    className="block p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {po.poNo || `PO-${po.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {po.vendor?.name || "No vendor"} • {po._count.items} items
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                        <p className="text-xs font-bold text-foreground mt-1">
                          {po.currency} {po.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm">No purchase orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Planned Orders & Vendors ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Planned Orders ────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                Planned Orders
              </h3>
            </div>
            <Link href="/dashboard/procurement/planned-purchase-orders">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {plannedOrders.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {plannedOrders.slice(0, 10).map((po) => {
                const statusBadge = getPlannedOrderStatusBadge(po.status as PlannedOrderStatus);
                const vendorNames = po.vendors.map((v) => v.vendor.name).join(", ") || "No vendors";
                return (
                  <Link
                    key={po.id}
                    href={`/dashboard/procurement/planned-purchase-orders/${po.id}`}
                    className="block p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {po.plannedPoNo || `PPO-${po.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {vendorNames}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                        <p className="text-xs font-bold text-foreground mt-1">
                          {po.currency} {po.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm">No planned orders found</p>
            </div>
          )}
        </div>

        {/* ─── Active Vendors ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Active Vendors
              </h3>
            </div>
            <Link href="/dashboard/vendors">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {activeVendors.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {activeVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/dashboard/vendors/${vendor.id}`}
                  className="block p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {vendor.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.vendorNo || `V-${vendor.id.slice(0, 6)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          vendor.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }
                      >
                        {vendor.status}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{vendor._count.purchaseOrders} PO</span>
                        <span>•</span>
                        <span>{vendor._count.quotations} QT</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm">No active vendors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}