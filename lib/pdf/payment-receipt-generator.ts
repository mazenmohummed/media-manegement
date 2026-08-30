// lib/pdf/payment-receipt-generator.ts
import { DocumentBuilder, DocumentOptions, DocumentSection } from "./document-builder";

export interface PaymentReceiptData {
  receiptNo: string;
  clientName: string;
  clientEmail: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  invoiceNo?: string;
  description?: string;
  transactionId?: string;
  notes?: string;
  agencyName?: string;
}

export class PaymentReceiptGenerator {
  private data: PaymentReceiptData;

  constructor(data: PaymentReceiptData) {
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

    const sections: DocumentSection[] = [
      {
        title: "Payment Details",
        content: "",
        type: "table",
        tableData: {
          headers: ["Field", "Value"],
          rows: [
            ["Payment Method", data.paymentMethod],
            ["Amount", this.formatCurrency(data.amount)],
            ...(data.invoiceNo ? [["Invoice", data.invoiceNo]] : []),
            ...(data.transactionId ? [["Transaction ID", data.transactionId]] : []),
            ...(data.description ? [["Description", data.description]] : []),
          ],
        },
      },
    ];

    if (data.notes) {
      sections.push({
        title: "Notes",
        type: "text",
        content: data.notes,
      });
    }

    const documentOptions: DocumentOptions = {
      title: "PAYMENT RECEIPT",
      subtitle: `Receipt #${data.receiptNo}`,
      companyName: data.agencyName || "Agency OS",
      footer: "Thank you for your payment!",
      sections,
      metadata: {
        "Receipt": data.receiptNo,
        "Client": data.clientName,
        "Date": data.paymentDate,
        "Amount": this.formatCurrency(data.amount),
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

export async function generatePaymentReceiptPdf(receipt: any): Promise<Uint8Array> {
  const data: PaymentReceiptData = {
    receiptNo: String(receipt.receiptNo || receipt.id),
    clientName: receipt.client?.clientName || receipt.client?.name || "Valued Client",
    clientEmail: receipt.client?.email || "",
    paymentDate: new Date(receipt.paymentDate || receipt.createdAt || Date.now()).toLocaleDateString(),
    paymentMethod: receipt.paymentMethod || "Bank Transfer",
    amount: receipt.amount || 0,
    currency: receipt.currency || "USD",
    invoiceNo: receipt.invoiceNo || undefined,
    description: receipt.description || undefined,
    transactionId: receipt.transactionId || undefined,
    notes: receipt.notes || undefined,
    agencyName: receipt.agency?.agencyName || "Agency OS",
  };

  const generator = new PaymentReceiptGenerator(data);
  return generator.getUint8Array();
}