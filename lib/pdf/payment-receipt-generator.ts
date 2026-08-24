import { buildDocumentPdf, PdfDocumentData } from "./document-builder";

export async function generatePaymentReceiptPdf(payment: any): Promise<Uint8Array> {
  const documentData: PdfDocumentData = {
    docType: "RECEIPT", // Or adjust based on your document builder types
    docNumber: String(payment.referenceNo || payment.paymentNo || payment.id.slice(-8)),
    agencyName: payment.agency?.agencyName || "Agency OS",
    clientName: payment.client?.clientName || "Valued Client",
    issueDate: new Date(payment.datePaid || payment.createdAt || Date.now()),
    validUntil: null,
    currency: payment.currency || "USD",
    totalAmount: payment.amount || 0,
    lineItems: (payment.allocations || []).map((alloc: any) => ({
      description: `Payment Allocation against Invoice: ${alloc.invoice?.invoiceNo || 'N/A'}`,
      quantity: 1,
      unitPrice: alloc.amount,
      total: alloc.amount,
    })),
    notes: payment.notes ? [payment.notes] : [],
  };

  return buildDocumentPdf(documentData);
}