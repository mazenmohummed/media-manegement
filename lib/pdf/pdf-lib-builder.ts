// lib/pdf/pdf-lib-builder.ts
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PdfDocumentData {
  docType: string;
  docNumber: string;
  agencyName: string;
  clientName?: string;
  issueDate: Date;
  validUntil?: Date | null;
  currency: string;
  lineItems: PdfLineItem[];
  totalAmount: number;
  notes?: string[];
  footer?: string;
}

export class PdfLibDocumentBuilder {
  private pdfDoc!: PDFDocument;
  private font!: PDFFont;
  private bold!: PDFFont;
  private page!: PDFPage;
  private y: number = 0;
  private margin: number = 50;
  private pageWidth: number = 0;
  private pageHeight: number = 0;

  constructor() {
    // Properties are initialized in the initialize method
    // The definite assignment assertion (!) tells TypeScript they will be set before use
  }

  private async initialize(data: PdfDocumentData): Promise<void> {
    this.pdfDoc = await PDFDocument.create();
    this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.page = this.pdfDoc.addPage([595, 842]);
    this.pageWidth = this.page.getSize().width;
    this.pageHeight = this.page.getSize().height;
    this.y = this.pageHeight - this.margin;
  }

  private drawText(
    text: string,
    x: number,
    size: number,
    f: PDFFont = this.font,
    color = rgb(0.1, 0.1, 0.1)
  ): void {
    this.page.drawText(text, { x, y: this.y, size, font: f, color });
  }

  private addNewPage(): void {
    this.page = this.pdfDoc.addPage([595, 842]);
    this.y = this.pageHeight - this.margin;
  }

  private checkPage(): void {
    if (this.y < 100) {
      this.addNewPage();
    }
  }

  public async build(data: PdfDocumentData): Promise<Uint8Array> {
    await this.initialize(data);

    // Header
    this.drawText(data.agencyName, this.margin, 18, this.bold);
    this.drawText(data.docType, this.pageWidth - this.margin - 120, 18, this.bold, rgb(0.4, 0.2, 0.7));
    this.y -= 30;
    this.drawText(`${data.docType} #${data.docNumber}`, this.margin, 11);
    this.y -= 16;
    this.drawText(`Issued: ${data.issueDate.toLocaleDateString()}`, this.margin, 10, this.font, rgb(0.4, 0.4, 0.4));
    if (data.validUntil) {
      this.drawText(`Valid until: ${data.validUntil.toLocaleDateString()}`, this.margin + 200, 10, this.font, rgb(0.4, 0.4, 0.4));
    }
    if (data.clientName) {
      this.y -= 16;
      this.drawText(`For: ${data.clientName}`, this.margin, 10);
    }
    this.y -= 30;

    // Line items table header
    const colX = { desc: this.margin, qty: 330, price: 400, total: 480 };
    this.drawText("Description", colX.desc, 10, this.bold);
    this.drawText("Qty", colX.qty, 10, this.bold);
    this.drawText("Unit Price", colX.price, 10, this.bold);
    this.drawText("Total", colX.total, 10, this.bold);
    this.y -= 8;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.pageWidth - this.margin, y: this.y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    this.y -= 16;

    for (const item of data.lineItems) {
      this.checkPage();
      this.drawText(item.description.slice(0, 45), colX.desc, 9);
      this.drawText(String(item.quantity), colX.qty, 9);
      this.drawText(`${data.currency} ${item.unitPrice.toLocaleString()}`, colX.price, 9);
      this.drawText(`${data.currency} ${item.total.toLocaleString()}`, colX.total, 9);
      this.y -= 16;
    }

    this.y -= 10;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.pageWidth - this.margin, y: this.y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    this.y -= 20;
    this.drawText(`Total: ${data.currency} ${data.totalAmount.toLocaleString()}`, colX.total - 60, 12, this.bold);
    this.y -= 40;

    if (data.notes?.length) {
      for (const note of data.notes) {
        if (!note) continue;
        this.checkPage();
        const lines = this.wrapText(note, 95);
        for (const line of lines) {
          this.drawText(line, this.margin, 9, this.font, rgb(0.3, 0.3, 0.3));
          this.y -= 13;
        }
        this.y -= 8;
      }
    }

    // Footer
    if (data.footer) {
      this.y = 30;
      this.drawText(data.footer, this.margin, 8, this.font, rgb(0.5, 0.5, 0.5));
    }

    return await this.pdfDoc.save();
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current += " " + word;
      }
    }
    if (current) lines.push(current.trim());
    return lines;
  }
}