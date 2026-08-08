import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PdfDocumentData {
  docType: string;        // "PROPOSAL" | "INVOICE" | "STATEMENT" — reused later
  docNumber: string;
  agencyName: string;
  clientName?: string;
  issueDate: Date;
  validUntil?: Date | null;
  currency: string;
  lineItems: PdfLineItem[];
  totalAmount: number;
  notes?: string[];       // scope / risks / assumptions / payment schedule, one block per string
}

export async function buildDocumentPdf(data: PdfDocumentData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4
  const margin = 50;
  let y = 842 - margin;
  const { width } = page.getSize();

  const drawText = (text: string, x: number, size: number, f: PDFFont = font, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x, y, size, font: f, color });
  };

  // Header
  drawText(data.agencyName, margin, 18, bold);
  drawText(data.docType, width - margin - 120, 18, bold, rgb(0.4, 0.2, 0.7));
  y -= 30;
  drawText(`${data.docType} #${data.docNumber}`, margin, 11);
  y -= 16;
  drawText(`Issued: ${data.issueDate.toLocaleDateString()}`, margin, 10, font, rgb(0.4, 0.4, 0.4));
  if (data.validUntil) {
    drawText(`Valid until: ${data.validUntil.toLocaleDateString()}`, margin + 200, 10, font, rgb(0.4, 0.4, 0.4));
  }
  if (data.clientName) {
    y -= 16;
    drawText(`For: ${data.clientName}`, margin, 10);
  }
  y -= 30;

  // Line items table header
  const colX = { desc: margin, qty: 330, price: 400, total: 480 };
  drawText("Description", colX.desc, 10, bold);
  drawText("Qty", colX.qty, 10, bold);
  drawText("Unit Price", colX.price, 10, bold);
  drawText("Total", colX.total, 10, bold);
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;

  for (const item of data.lineItems) {
    if (y < 100) { page = pdfDoc.addPage([595, 842]); y = 842 - margin; }
    drawText(item.description.slice(0, 45), colX.desc, 9);
    drawText(String(item.quantity), colX.qty, 9);
    drawText(`${data.currency} ${item.unitPrice.toLocaleString()}`, colX.price, 9);
    drawText(`${data.currency} ${item.total.toLocaleString()}`, colX.total, 9);
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 20;
  drawText(`Total: ${data.currency} ${data.totalAmount.toLocaleString()}`, colX.total - 60, 12, bold);
  y -= 40;

  if (data.notes?.length) {
    for (const note of data.notes) {
      if (!note) continue;
      if (y < 100) { page = pdfDoc.addPage([595, 842]); y = 842 - margin; }
      const lines = wrapText(note, 95);
      for (const line of lines) {
        drawText(line, margin, 9, font, rgb(0.3, 0.3, 0.3));
        y -= 13;
      }
      y -= 8;
    }
  }

  return pdfDoc.save();
}

function wrapText(text: string, maxChars: number): string[] {
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