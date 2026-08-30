// lib/pdf/document-builder.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface DocumentSection {
  title: string;
  content: string | string[];
  type: "text" | "list" | "table";
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export interface DocumentOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  logoUrl?: string;
  footer?: string;
  sections?: DocumentSection[];
  metadata?: Record<string, string>;
}

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
  additionalData?: Record<string, any>;
}

export class DocumentBuilder {
  private doc: jsPDF;
  private options: DocumentOptions;
  private yPosition: number;
  private pageWidth: number;
  private margin: number;
  private isFirstPage: boolean;
  private sectionsProcessed: boolean;

  constructor(options: DocumentOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    this.yPosition = 20;
    this.pageWidth = 210;
    this.margin = 20;
    this.isFirstPage = true;
    this.sectionsProcessed = false;
  }

  private addHeader(): void {
    const { doc } = this;
    let y = this.yPosition;

    if (this.isFirstPage) {
      // Company name
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 80, 200);
      doc.text(this.options.companyName || "Agency OS", this.margin, y);
      y += 8;

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(this.options.title, this.margin, y);
      y += 10;

      // Subtitle
      if (this.options.subtitle) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(this.options.subtitle, this.margin, y);
        y += 10;
      }

      // Metadata
      if (this.options.metadata) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        const metadataLines = Object.entries(this.options.metadata).map(
          ([key, value]) => `${key}: ${value}`
        );
        const metadataText = metadataLines.join("  |  ");
        doc.text(metadataText, this.margin, y);
        y += 10;
      }

      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(this.margin, y, this.pageWidth - this.margin, y);
      y += 10;

      this.isFirstPage = false;
    } else {
      // On subsequent pages, just add a small header
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      const headerText = `${this.options.title}${this.options.subtitle ? ` - ${this.options.subtitle}` : ''}`;
      doc.text(headerText, this.margin, y);
      y += 8;
      
      // Small separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(this.margin, y, this.pageWidth - this.margin, y);
      y += 10;
    }

    this.yPosition = y;
  }

  private addSection(section: DocumentSection): void {
    const { doc } = this;
    let y = this.yPosition;

    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
      this.yPosition = y;
      // Add header for new page
      this.addHeader();
      y = this.yPosition;
    }

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(section.title, this.margin, y);
    y += 6;

    switch (section.type) {
      case "text":
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const textContent = typeof section.content === "string" 
          ? section.content 
          : section.content.join("\n");
        const textLines = doc.splitTextToSize(textContent, this.pageWidth - this.margin * 2);
        doc.text(textLines, this.margin, y);
        y += textLines.length * 5 + 4;
        break;

      case "list":
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const items = typeof section.content === "string" ? [section.content] : section.content;
        items.forEach((item) => {
          doc.text(`• ${item}`, this.margin + 5, y);
          y += 6;
        });
        y += 4;
        break;

      case "table":
        if (section.tableData) {
          try {
            autoTable(doc, {
              startY: y,
              head: [section.tableData.headers],
              body: section.tableData.rows,
              theme: "striped",
              headStyles: {
                fillColor: [100, 80, 200],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: "bold",
              },
              bodyStyles: {
                fontSize: 7,
                textColor: [40, 40, 40],
              },
              alternateRowStyles: {
                fillColor: [245, 245, 250],
              },
              margin: { left: this.margin, right: this.margin },
              columnStyles: {
                0: { cellWidth: "auto", minCellWidth: 30 },
              },
              tableWidth: "auto",
            });
            // @ts-ignore
            y = doc.lastAutoTable.finalY + 6;
          } catch (error) {
            console.error("Failed to render table:", error);
            // Fallback
            const headers = section.tableData.headers.join(" | ");
            doc.text(headers, this.margin, y);
            y += 5;
            section.tableData.rows.forEach((row) => {
              const rowText = row.join(" | ");
              doc.text(rowText, this.margin, y);
              y += 4;
            });
            y += 4;
          }
        }
        break;
    }

    this.yPosition = y;
  }

  private addFooter(): void {
    const { doc } = this;
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(180, 180, 180);

      if (this.options.footer) {
        doc.text(this.options.footer, this.margin, 285);
      }

      doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin, 285, { align: "right" });

      doc.setDrawColor(220, 220, 220);
      doc.line(this.margin, 280, this.pageWidth - this.margin, 280);
    }
  }

  public addSectionItem(section: DocumentSection): this {
    this.addSection(section);
    return this;
  }

  public build(): jsPDF {
    // Only process sections once
    if (!this.sectionsProcessed) {
      this.addHeader();

      if (this.options.sections) {
        this.options.sections.forEach((section) => {
          this.addSection(section);
        });
      }

      this.sectionsProcessed = true;
    }

    this.addFooter();
    return this.doc;
  }

  public save(filename: string): void {
    this.build().save(filename);
  }

  public getBlob(): Blob {
    const pdf = this.build();
    return pdf.output("blob");
  }

  public getDataUri(): string {
    const pdf = this.build();
    return pdf.output("datauristring");
  }

  public getBase64(): string {
    const pdf = this.build();
    return pdf.output("datauristring").split(",")[1];
  }

  public getArrayBuffer(): ArrayBuffer {
    const pdf = this.build();
    return pdf.output("arraybuffer");
  }

  public getUint8Array(): Uint8Array {
    const pdf = this.build();
    return new Uint8Array(this.getArrayBuffer());
  }
}

export const defaultDocumentOptions: Partial<DocumentOptions> = {
  companyName: "Agency OS",
  footer: "Generated by Agency OS - Confidential",
};

export async function buildDocumentPdf(data: PdfDocumentData): Promise<Uint8Array> {
  const sections: DocumentSection[] = [];

  if (data.lineItems && data.lineItems.length > 0) {
    sections.push({
      title: "Line Items",
      content: "",
      type: "table",
      tableData: {
        headers: ["Description", "Quantity", "Unit Price", "Total"],
        rows: data.lineItems.map((item) => [
          item.description,
          item.quantity,
          `${data.currency} ${item.unitPrice.toFixed(2)}`,
          `${data.currency} ${item.total.toFixed(2)}`,
        ]),
      },
    });
  }

  const summaryContent = [
    `Total Amount: ${data.currency} ${data.totalAmount.toFixed(2)}`,
    ...(data.validUntil ? [`Valid Until: ${data.validUntil.toLocaleDateString()}`] : []),
  ];
  
  sections.push({
    title: "Summary",
    content: summaryContent,
    type: "text",
  });

  if (data.notes && data.notes.length > 0) {
    sections.push({
      title: "Notes",
      content: data.notes,
      type: "list",
    });
  }

  const options: DocumentOptions = {
    title: data.docType,
    subtitle: `${data.docType} #${data.docNumber}`,
    companyName: data.agencyName || "Agency OS",
    footer: `Generated by ${data.agencyName || "Agency OS"} - Confidential`,
    sections,
    metadata: {
      "Document": data.docType,
      "Number": data.docNumber,
      "Client": data.clientName || "N/A",
      "Issue Date": data.issueDate.toLocaleDateString(),
      "Currency": data.currency,
    },
  };

  const builder = new DocumentBuilder(options);
  return builder.getUint8Array();
}