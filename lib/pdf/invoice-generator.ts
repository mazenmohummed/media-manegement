// lib/pdf/invoice-generator.ts
import { DocumentBuilder, DocumentOptions, DocumentSection } from "./document-builder";

export interface InvoiceData {
  invoiceNo: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  currency?: string;
  agencyName?: string;
}

export class InvoiceGenerator {
  private data: InvoiceData;

  constructor(data: InvoiceData) {
    this.data = data;
  }

  private formatCurrency(value: number): string {
    const currency = this.data.currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  }

  public generate(): DocumentBuilder {
    const { data } = this;
    const currency = data.currency || "USD";

    const sections: DocumentSection[] = [
      {
        title: "Invoice Details",
        content: "", // ✅ Added content property
        type: "table",
        tableData: {
          headers: ["Item", "Quantity", "Unit Price", "Total"],
          rows: data.items.map((item) => [
            item.description,
            item.quantity,
            this.formatCurrency(item.unitPrice),
            this.formatCurrency(item.total),
          ]),
        },
      },
      {
        title: "Summary",
        content: "", // ✅ Added content property
        type: "table",
        tableData: {
          headers: ["Description", "Amount"],
          rows: [
            ["Subtotal", this.formatCurrency(data.subtotal)],
            [`Tax (${(data.taxRate * 100).toFixed(0)}%)`, this.formatCurrency(data.taxAmount)],
            ["Total", this.formatCurrency(data.total)],
          ],
        },
      },
    ];

    if (data.notes) {
      sections.push({
        title: "Notes",
        content: data.notes, // ✅ Already has content
        type: "text",
      });
    }

    // Client information
    const clientInfo = [
      `Client: ${data.clientName}`,
      `Email: ${data.clientEmail}`,
      ...(data.clientAddress ? [`Address: ${data.clientAddress}`] : []),
    ];

    sections.unshift({
      title: "Client Information",
      content: clientInfo, // ✅ Already has content
      type: "text",
    });

    const documentOptions: DocumentOptions = {
      title: "INVOICE",
      subtitle: `Invoice #${data.invoiceNo}`,
      companyName: data.agencyName || "Agency OS",
      footer: "Thank you for your business!",
      sections,
      metadata: {
        "Invoice": data.invoiceNo,
        "Client": data.clientName,
        "Issue Date": data.issueDate,
        "Due Date": data.dueDate,
        "Currency": currency,
      },
    };

    return new DocumentBuilder(documentOptions);
  }

  public save(filename: string): void {
    this.generate().save(filename);
  }

  public getBlob(): Blob {
    return this.generate().getBlob();
  }

  public getBase64(): string {
    return this.generate().getBase64();
  }

  public getUint8Array(): Uint8Array {
    return this.generate().getUint8Array();
  }
}

export async function generateInvoicePdf(invoice: any): Promise<Uint8Array> {
  const data: InvoiceData = {
    invoiceNo: String(invoice.invoiceNo || invoice.id),
    clientName: invoice.client?.clientName || invoice.client?.name || "Valued Client",
    clientEmail: invoice.client?.email || "",
    clientAddress: invoice.client?.billingAddress || invoice.client?.address,
    issueDate: new Date(invoice.createdAt || Date.now()).toLocaleDateString(),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    items: (invoice.items || []).map((item: any) => ({
      description: item.description || item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      total: (item.quantity || 1) * (item.unitPrice || 0) - (item.discountAmount || 0),
    })),
    subtotal: invoice.subtotal || invoice.totalAmount || 0,
    taxRate: invoice.taxRate || 0,
    taxAmount: invoice.taxAmount || 0,
    total: invoice.totalAmount || 0,
    notes: invoice.notes || undefined,
    currency: invoice.currency || "USD",
    agencyName: invoice.agency?.agencyName || "Agency OS",
  };

  const generator = new InvoiceGenerator(data);
  return generator.getUint8Array();
}