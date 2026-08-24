import { buildDocumentPdf, PdfDocumentData } from "./document-builder";

export async function generateInvoicePdf(invoice: any): Promise<Uint8Array> {
  const documentData: PdfDocumentData = {
    docType: "INVOICE",
    docNumber: String(invoice.invoiceNo || invoice.id),
    agencyName: invoice.agency?.agencyName || "Agency OS",
    clientName: invoice.client?.clientName || invoice.client?.name || "Valued Client", // Added client name here
    issueDate: new Date(invoice.createdAt || Date.now()),
    validUntil: invoice.dueDate ? new Date(invoice.dueDate) : null,
    currency: invoice.currency || "USD",
    totalAmount: invoice.totalAmount || 0,
    lineItems: (invoice.items || []).map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: (item.quantity * item.unitPrice) - (item.discountAmount || 0),
    })),
    notes: invoice.notes ? [invoice.notes] : [],
  };

  return buildDocumentPdf(documentData);
}