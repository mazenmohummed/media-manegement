import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { invoiceId } = await params;

  const invoice = await db.clientInvoice.findUnique({
    where: { id: invoiceId, agencyId: session.user.agencyId },
    include: {
      client: true,
      project: { select: { id: true, name: true, projectName: true } },
      agency: { select: { agencyName: true } },
      items: true,
    },
  });

  if (!invoice) return notFound();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>

        {/* PDF Download / Print Button */}
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
        >
          <Download className="w-4 h-4" /> Download PDF
        </a>
      </div>

      {/* Invoice Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-zinc-100">{invoice.invoiceNo}</h1>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Issued on {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "N/A"}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-zinc-500 block">Balance Due</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {invoice.currency} {invoice.balanceDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Client & Agency metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 font-semibold block">Billed From</span>
            <p className="text-zinc-200 font-medium">{invoice.agency.agencyName}</p>
          </div>
          <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 font-semibold block">Billed To</span>
            <p className="text-zinc-200 font-medium">{invoice.client?.clientName}</p>
            <p className="text-zinc-400">{invoice.client?.email}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-zinc-200">Invoice Items</h3>
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium text-center">Qty</th>
                  <th className="p-3 font-medium text-right">Unit Price</th>
                  <th className="p-3 font-medium text-right">Tax (%)</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {invoice.items.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice - item.discountAmount;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/20">
                      <td className="p-3 text-zinc-200">{item.description}</td>
                      <td className="p-3 text-zinc-300 text-center">{item.quantity}</td>
                      <td className="p-3 text-zinc-300 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 text-zinc-300 text-right">{item.taxRate}%</td>
                      <td className="p-3 text-zinc-100 font-medium text-right">
                        {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary Breakdown */}
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="text-zinc-200">{invoice.currency} {invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Tax Amount</span>
              <span className="text-zinc-200">{invoice.currency} {invoice.taxAmount.toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Discount</span>
                <span className="text-red-400">-{invoice.currency} {invoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-zinc-100 pt-2 border-t border-zinc-800">
              <span>Total Amount</span>
              <span>{invoice.currency} {invoice.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Amount Paid</span>
              <span className="text-emerald-400">{invoice.currency} {invoice.amountPaid.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="bg-zinc-950/40 p-4 rounded-lg border border-zinc-800/60 space-y-1">
            <span className="text-xs font-semibold text-zinc-400">Notes / Terms</span>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}