// app/dashboard/procurement/planned-purchase-orders/[orderId]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PlannedOrderActions from "@/components/quotations/PlannedOrderActions";
import { ProcurementChainStatus } from "@/components/procurement/ProcurementChainStatus";

interface PageProps {
  params: Promise<{ "planned-purchase-ordersId": string }>;
}

export default async function PlannedOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const resolvedParams = await params;
  const id = resolvedParams["planned-purchase-ordersId"];

  const plannedOrder = await db.plannedPurchaseOrder.findUnique({
    where: { id },
    include: {
      vendors: { include: { vendor: true } },
      vendor: true, // Included legacy single vendor relation if used
      project: {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              taskType: true,
            },
            take: 1, // Get the first task associated with the project
          }
        }
      },
      quotation: {
        include: {
          project: {
            include: {
              tasks: {
                select: {
                  id: true,
                  title: true,
                  taskType: true,
                },
                take: 1,
              }
            }
          }
        }
      },
      items: true,
    },
  });

  if (!plannedOrder || plannedOrder.agencyId !== session.user.agencyId) {
    return notFound();
  }

  // Find the task ID - first try from the quotation's project, then from the planned order's project
  const taskId = plannedOrder.quotation?.project?.tasks?.[0]?.id || 
                 plannedOrder.project?.tasks?.[0]?.id || 
                 null;

  // Combine multi-vendors and single vendor fallback for display names
  const vendorNames = plannedOrder.vendors.length > 0 
    ? plannedOrder.vendors.map((v) => v.vendor.name).join(", ") 
    : plannedOrder.vendor?.name || "None";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href="/dashboard/procurement/planned-purchase-orders"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Planned Orders
        </Link>
        
        <PlannedOrderActions 
          id={plannedOrder.id} 
          status={plannedOrder.status} 
          initialData={{
            notes: plannedOrder.notes,
            expectedDeliveryDate: plannedOrder.expectedDeliveryDate ? new Date(plannedOrder.expectedDeliveryDate).toISOString().split('T')[0] : "",
            currency: plannedOrder.currency,
            totalAmount: plannedOrder.totalAmount,
            quotationId: plannedOrder.quotationId,
            items: plannedOrder.items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unitCost: i.unitCost,
            }))
          }}
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-100">{plannedOrder.plannedPoNo || "Planned Order"}</h1>
          <Badge
            className={`font-mono uppercase ${
              plannedOrder.status === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : plannedOrder.status === "REJECTED"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {plannedOrder.status}
          </Badge>
        </div>

        {/* Primary Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800 text-sm">
          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Total Planned Amount</span>
            <p className="text-lg font-bold text-zinc-100">
              {plannedOrder.currency} {plannedOrder.totalAmount.toLocaleString()}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Vendors</span>
            <p className="font-medium text-zinc-200">{vendorNames}</p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Project</span>
            <p className="font-medium text-zinc-200 uppercase">
              {plannedOrder.project?.name || "None"}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Linked Quotation</span>
            <p className="font-medium text-zinc-200">
              {plannedOrder.quotationId ? (
                <Link
                  href={`/dashboard/procurement/quotations/${plannedOrder.quotationId}`}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                  {plannedOrder.quotation?.quotationNo || `#${plannedOrder.quotationId.slice(0, 8)}`}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Expected Delivery</span>
            <p className="font-medium text-zinc-200">
              {plannedOrder.expectedDeliveryDate 
                ? new Date(plannedOrder.expectedDeliveryDate).toLocaleDateString() 
                : "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Created At</span>
            <p className="font-medium text-zinc-200">
              {new Date(plannedOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* ─── PROCUREMENT CHAIN STATUS ─── */}
        {taskId && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span className="text-blue-400">◆</span>
                Procurement Chain
              </h3>
              <span className="text-xs text-zinc-500">
                Task: {plannedOrder.quotation?.project?.tasks?.[0]?.title || 
                       plannedOrder.project?.tasks?.[0]?.title || 
                       taskId.slice(0, 8)}
              </span>
            </div>
            <ProcurementChainStatus taskId={taskId} />
          </div>
        )}

        {/* Notes Section (if available) */}
        {plannedOrder.notes && (
          <div className="pt-4 border-t border-zinc-800 space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Internal Notes</p>
            <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap">
              {plannedOrder.notes}
            </p>
          </div>
        )}

        {/* Items Line Breakdown */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Items ({plannedOrder.items.length})</p>
          <div className="space-y-2">
            {plannedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 gap-2"
              >
                <div>
                  <span className="text-zinc-300 font-medium block sm:inline">{item.description}</span>
                  <span className="text-zinc-500 sm:ml-2 block sm:inline">
                    (Qty: {item.quantity} × {plannedOrder.currency} {item.unitCost.toLocaleString()})
                  </span>
                </div>
                <span className="text-zinc-200 font-mono font-bold self-end sm:self-auto">
                  {plannedOrder.currency} {item.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}