import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { QuotationStatus } from "@prisma/client";
import {
  ArrowLeft,
  Building,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  PlusCircle,
  ClipboardList,
  Calculator,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuotationDetailClientWrapper from "@/components/quotations/QuotationDetailClientWrapper";
import {QuotationStatusButtons} from "@/components/quotations/QuotationDetailPage";

interface PageProps {
  params: Promise<{ quotationId: string }>;
}

export default async function QuotationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { quotationId } = await params;

  // Fetch quotation along with vendors, projects, and related orders
  const quotation = await db.quotation.findUnique({
    where: { id: quotationId },
    include: {
      vendor: { select: { id: true, name: true, email: true, phoneNumber: true } },
      vendors: {
        include: {
          vendor: { select: { id: true, name: true } },
        },
      },
      project: { select: { id: true, name: true, projectNo: true, status: true, totalValue: true, currency: true } },
      purchaseOrders: {
        include: {
          vendor: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      plannedOrders: {
        include: {
          vendor: { select: { id: true, name: true } },
          vendors: { include: { vendor: { select: { id: true, name: true } } } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      agency: { select: { agencyName: true } },
    },
  });

  if (!quotation || quotation.agencyId !== agencyId) {
    return notFound();
  }

  // Fetch all active vendors and projects for the agency to power the Edit Form dropdowns
  const [vendors, projects] = await Promise.all([
    db.vendor.findMany({
      where: { agencyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.project.findMany({
      where: { agencyId },
      select: { id: true, name: true, projectNo: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Server action for handling quotation updates from EditQuotationClient
  async function updateQuotationAction(formData: FormData) {
    "use server";

    const status = formData.get("status") as QuotationStatus;
    const vendorIds = formData.getAll("vendorIds") as string[];
    const projectId = formData.get("projectId") as string;
    const validUntilStr = formData.get("validUntil") as string;
    const description = formData.get("description") as string;
    const notes = formData.get("notes") as string;

    await db.$transaction(async (tx) => {
      // Update main quotation fields
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status,
          vendorId: vendorIds.length > 0 ? vendorIds[0] : null,
          projectId: projectId || null,
          validUntil: validUntilStr ? new Date(validUntilStr) : null,
          description: description || null,
          notes: notes || null,
        },
      });

      // Synchronize multiple vendors relation if your schema uses a junction table (QuotationVendor)
      if (tx.quotationVendor) {
        await tx.quotationVendor.deleteMany({
          where: { quotationId },
        });

        if (vendorIds.length > 0) {
          await tx.quotationVendor.createMany({
            data: vendorIds.map((vId) => ({
              quotationId,
              vendorId: vId,
            })),
          });
        }
      }
    });

    revalidatePath(`/dashboard/procurement/quotations/${quotationId}`);
    redirect(`/dashboard/procurement/quotations/${quotationId}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link
          href="/dashboard/procurement/quotations"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>

        {/* Action Buttons wrapped with Client Component Modal Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF Download Button */}
          
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200">
            <a href={`/api/quotations/${quotation.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2 text-purple-400" /> Download PDF
            </a>
          </Button>

          <QuotationDetailClientWrapper
            agencyId={agencyId}
            quotation={quotation}
            vendors={vendors}
            projects={projects}
            updateQuotationAction={updateQuotationAction}
          >
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200">
              <Link href={`/dashboard/procurement/planned-purchase-orders/new?quotationId=${quotation.id}`}>
                <ClipboardList className="w-4 h-4 mr-2 text-blue-400" /> Create Planned Order
              </Link>
            </Button>

            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href={`/dashboard/vendors/purchase-orders/new?quotationId=${quotation.id}`}>
                <PlusCircle className="w-4 h-4 mr-2" /> Create Purchase Order
              </Link>
            </Button>
          </QuotationDetailClientWrapper>
        </div>
      </div>

      <QuotationStatusButtons quotationId={quotation.id} currentStatus={quotation.status} />

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">
                {quotation.quotationNo || `Quotation #${quotation.id.slice(0, 8)}`}
              </h1>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                {quotation.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-zinc-500" />
              Vendor:{" "}
              <span className="text-zinc-200 font-medium">
                {quotation.vendor?.name ||
                  (quotation.vendors.length > 0
                    ? quotation.vendors.map((v) => v.vendor.name).join(", ")
                    : "Unassigned")}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Quotation Amount
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {quotation.amount != null
                ? `${quotation.currency} ${quotation.amount.toLocaleString()}`
                : `${quotation.currency} 0`}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-blue-400" /> Planned Amount
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {quotation.plannedAmount != null
                ? `${quotation.currency} ${quotation.plannedAmount.toLocaleString()}`
                : `${quotation.currency} 0`}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Valid Until
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {quotation.validUntil
                ? new Date(quotation.validUntil).toLocaleDateString()
                : "No expiration date"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-blue-400" /> Planned Total POs
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {quotation.plannedOrders.length > 0 ? `${quotation.plannedOrders.length} Created` : "0"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-400" /> Total Purchase Orders
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {quotation.purchaseOrders.length > 0 ? `${quotation.purchaseOrders.length} Created` : "0"}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Planned Purchase Orders Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          Linked Planned Purchase Orders ({quotation.plannedOrders.length})
        </h3>

        {quotation.plannedOrders.length > 0 ? (
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/60 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="p-3">Planned PO No</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Vendor(s)</th>
                  <th className="p-3">Items Count</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {quotation.plannedOrders.map((plannedPo) => {
                  const assignedVendors =
                    plannedPo.vendors && plannedPo.vendors.length > 0
                      ? plannedPo.vendors.map((v) => v.vendor.name).join(", ")
                      : plannedPo.vendor?.name || "Unassigned";

                  return (
                    <tr key={plannedPo.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="p-3 font-medium">
                        <Link
                          href={`/dashboard/procurement/planned-purchase-orders/${plannedPo.id}`}
                          className="text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          {plannedPo.plannedPoNo || `PPO #${plannedPo.id.slice(0, 8)}`}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px]">
                          {plannedPo.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-zinc-300 max-w-[200px] truncate" title={assignedVendors}>
                        {assignedVendors}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {plannedPo.items?.length || 0} line(s)
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-zinc-200">
                        {plannedPo.currency} {plannedPo.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No planned purchase orders have been linked to this quotation yet.</p>
        )}
      </div>

      {/* Linked Purchase Orders Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          Linked Purchase Orders ({quotation.purchaseOrders.length})
        </h3>

        {quotation.purchaseOrders.length > 0 ? (
          <div className="space-y-4">
            {quotation.purchaseOrders.map((po) => (
              <div key={po.id} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <Link
                      href={`/dashboard/vendors/purchase-orders/${po.id}`}
                      className="font-medium text-purple-400 hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      {po.poNo || `PO #${po.id.slice(0, 8)}`}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-zinc-500" />
                      Vendor: <span className="text-zinc-200 font-medium">{po.vendor?.name || "Unassigned"}</span>
                    </p>

                    <p className="text-xs text-zinc-400 mt-0.5">
                      Total Amount: <span className="text-zinc-200 font-semibold">{po.currency} {po.totalAmount.toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs h-8">
                      <a href={`/api/purchase-orders/${po.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3.5 h-3.5 mr-1 text-purple-400" /> Receipt PDF
                      </a>
                    </Button>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                      {po.status}
                    </Badge>
                  </div>
                </div>

                {po.items && po.items.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Items</p>
                    <div className="space-y-1.5">
                      {po.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-xs bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50">
                          <span className="text-zinc-300">{item.description} (x{item.quantity})</span>
                          <span className="text-zinc-200 font-mono">{po.currency} {item.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No purchase orders have been created from this quotation yet.</p>
        )}
      </div>

      {/* Description & Notes */}
      {quotation.description && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
            Description & Scope
          </h3>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{quotation.description}</p>
        </div>
      )}

      {/* Linked Project Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          Associated Project
        </h3>
        {quotation.project ? (
          <div className="flex items-center justify-between text-sm">
            <div>
              <Link
                href={`/dashboard/projects/${quotation.project.id}`}
                className="font-medium text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                {quotation.project.name}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <p className="text-xs text-zinc-500 mt-0.5">
                Project Value: {quotation.project.currency} {quotation.project.totalValue.toLocaleString()}
              </p>
            </div>
            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
              {quotation.project.status}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No project is currently linked to this quotation.</p>
        )}
      </div>

      {quotation.notes && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-200">Internal Notes</h3>
          <p className="text-xs text-zinc-400 whitespace-pre-wrap">{quotation.notes}</p>
        </div>
      )}
    </div>
  );
}