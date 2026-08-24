import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { PlusCircle, ExternalLink, Building, Search, Calendar, Package, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function PlannedPurchaseOrdersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams.search || "";
  const statusQuery = resolvedSearchParams.status || "ALL";

  const plannedOrders = await db.plannedPurchaseOrder.findMany({
    where: {
      agencyId: session.user.agencyId,
      AND: [
        statusQuery !== "ALL" ? { status: statusQuery as any } : {},
        searchQuery
          ? {
              OR: [
                { plannedPoNo: { contains: searchQuery, mode: "insensitive" } },
                { notes: { contains: searchQuery, mode: "insensitive" } },
                { project: { name: { contains: searchQuery, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      vendors: { include: { vendor: true } },
      project: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 uppercase tracking-tight">Planned Purchase Orders</h1>
          <p className="text-xs text-zinc-400">Manage your pre-purchase shopping lists and inventory pipelines.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl shadow-lg">
          <Link href="/dashboard/procurement/planned-purchase-orders/new">
            <PlusCircle className="w-4 h-4 mr-2" /> New Planned Order
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <form method="GET" className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by PO number, notes..."
            className="w-full bg-zinc-950 border-zinc-800 rounded-xl pl-9 pr-3 text-xs text-zinc-100 focus-visible:ring-blue-600"
          />
          <input type="hidden" name="status" value={statusQuery} />
        </form>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["ALL", "PLANNED", "APPROVED", "REJECTED"].map((st) => (
            <Link
              key={st}
              href={`/dashboard/procurement/planned-purchase-orders?status=${st}&search=${searchQuery}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors whitespace-nowrap ${
                statusQuery === st
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {st}
            </Link>
          ))}
        </div>
      </div>

      {/* Data Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {plannedOrders.length > 0 ? (
          plannedOrders.map((order) => {
            const vendorNames = order.vendors.map((v) => v.vendor.name).join(", ");
            const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-700 transition-all shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/procurement/planned-purchase-orders/${order.id}`}
                      className="font-black text-sm text-blue-400 hover:underline inline-flex items-center gap-1 uppercase tracking-wider"
                    >
                      {order.plannedPoNo || `PPO #${order.id.slice(0, 8)}`}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Badge
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border ${
                        order.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : order.status === "REJECTED"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {order.status}
                    </Badge>
                    {order.project && (
                      <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-bold text-[10px] uppercase">
                        <Layers className="w-3 h-3 mr-1 text-zinc-400" /> {order.project.name}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs text-zinc-400">
                    <p className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">Vendors: <strong className="text-zinc-200">{vendorNames || "None assigned"}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>Items Qty: <strong className="text-zinc-200">{totalItemsCount}</strong> ({order.items.length} lines)</span>
                    </p>
                    {order.expectedDeliveryDate && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>Delivery: <strong className="text-zinc-200">{new Date(order.expectedDeliveryDate).toLocaleDateString()}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800 shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Total Amount</span>
                  <span className="text-base font-black text-zinc-100 font-mono">
                    {order.currency} {order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-sm text-zinc-500 italic">No planned purchase orders found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}