// lib/pdf/quotation-generator.ts
import { DocumentBuilder, DocumentOptions, DocumentSection } from "./document-builder";

export interface QuotationData {
  quotationNo: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  issueDate: string;
  validUntil: string;
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
  terms?: string[];
  notes?: string;
  currency?: string;
  agencyName?: string;
}

export class QuotationGenerator {
  private data: QuotationData;

  constructor(data: QuotationData) {
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
        title: "Quotation Details",
        content: "",
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
        content: "",
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

    if (data.terms && data.terms.length > 0) {
      sections.push({
        title: "Terms & Conditions",
        type: "list",
        content: data.terms,
      });
    }

    if (data.notes) {
      sections.push({
        title: "Notes",
        type: "text",
        content: data.notes,
      });
    }

    // Client information
    const clientInfo = [
      `Client: ${data.clientName}`,
      ...(data.clientCompany ? [`Company: ${data.clientCompany}`] : []),
      `Email: ${data.clientEmail}`,
    ];

    sections.unshift({
      title: "Client Information",
      type: "text",
      content: clientInfo,
    });

    const documentOptions: DocumentOptions = {
      title: "QUOTATION",
      subtitle: `Quotation #${data.quotationNo}`,
      companyName: data.agencyName || "Agency OS",
      footer: "This quotation is valid until the specified date.",
      sections,
      metadata: {
        "Quotation": data.quotationNo,
        "Client": data.clientName,
        "Issue Date": data.issueDate,
        "Valid Until": data.validUntil,
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

  public getUint8Array(): Uint8Array {
    return this.generate().getUint8Array();
  }
}

export async function generateQuotationPdf(quotation: any): Promise<Uint8Array> {
  const data: QuotationData = {
    quotationNo: String(quotation.quotationNo || quotation.id),
    clientName: quotation.client?.clientName || quotation.client?.name || "Valued Client",
    clientEmail: quotation.client?.email || "",
    clientCompany: quotation.client?.companyName || quotation.client?.clientName,
    issueDate: new Date(quotation.createdAt || Date.now()).toLocaleDateString(),
    validUntil: quotation.validUntil 
      ? new Date(quotation.validUntil).toLocaleDateString() 
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    items: (quotation.lineItems || quotation.items || []).map((item: any) => ({
      description: item.description || item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    })),
    subtotal: quotation.subtotal || quotation.totalAmount || 0,
    taxRate: quotation.taxRate || 0,
    taxAmount: quotation.taxAmount || 0,
    total: quotation.totalAmount || 0,
    terms: quotation.terms || quotation.termsAndConditions || [],
    notes: quotation.notes || undefined,
    currency: quotation.currency || "USD",
    agencyName: quotation.agency?.agencyName || "Agency OS",
  };

  const generator = new QuotationGenerator(data);
  return generator.getUint8Array();
}