import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PurchaseOrderActions from "@/components/quotations/PurchaseOrderActions";

interface PageProps {
  params: Promise<{ "purchase-ordersId": string }>;
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const resolvedParams = await params;
  const id = resolvedParams["purchase-ordersId"];

  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: true,
      project: true,
      quotation: true,
      items: true,
    },
  });

  if (!purchaseOrder || purchaseOrder.agencyId !== session.user.agencyId) {
    return notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href={`/dashboard/vendors/${purchaseOrder.vendorId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Vendor
        </Link>
        
        {/* Action Buttons & PDF Download */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs h-8">
            <a href={`/api/purchase-orders/${purchaseOrder.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="w-3.5 h-3.5 mr-1 text-purple-400" /> Receipt PDF
            </a>
          </Button>
          <PurchaseOrderActions purchaseOrder={purchaseOrder} />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-100">{purchaseOrder.poNo || "Purchase Order"}</h1>
          <Badge
            className={`font-mono uppercase ${
              purchaseOrder.status === "DELIVERED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : purchaseOrder.status === "CANCELLED"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {purchaseOrder.status}
          </Badge>
        </div>

        {/* Primary Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800 text-sm">
          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Total Amount</span>
            <p className="text-lg font-bold text-zinc-100">
              {purchaseOrder.currency} {purchaseOrder.totalAmount.toLocaleString()}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Vendor</span>
            <p className="font-medium text-zinc-200">{purchaseOrder.vendor?.name || "None"}</p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Project</span>
            <p className="font-medium text-zinc-200 uppercase">
              {purchaseOrder.project?.name || "None"}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Linked Quotation</span>
            <p className="font-medium text-zinc-200">
              {purchaseOrder.quotationId ? (
                <Link
                  href={`/dashboard/procurement/quotations/${purchaseOrder.quotationId}`}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                  {purchaseOrder.quotation?.quotationNo || `#${purchaseOrder.quotationId.slice(0, 8)}`}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Expected Delivery</span>
            <p className="font-medium text-zinc-200">
              {purchaseOrder.expectedDeliveryDate 
                ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() 
                : "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-zinc-400 block text-xs uppercase tracking-wider">Created At</span>
            <p className="font-medium text-zinc-200">
              {new Date(purchaseOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        {purchaseOrder.notes && (
          <div className="pt-4 border-t border-zinc-800 space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Internal Notes</p>
            <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap">
              {purchaseOrder.notes}
            </p>
          </div>
        )}

        {/* Items Line Breakdown */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Items ({purchaseOrder.items.length})</p>
          <div className="space-y-2">
            {purchaseOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 gap-2"
              >
                <div>
                  <span className="text-zinc-300 font-medium block sm:inline">{item.description}</span>
                  <span className="text-zinc-500 sm:ml-2 block sm:inline">
                    (Qty: {item.quantity} × {purchaseOrder.currency} {item.unitCost.toLocaleString()})
                  </span>
                </div>
                <span className="text-zinc-200 font-mono font-bold self-end sm:self-auto">
                  {purchaseOrder.currency} {item.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}