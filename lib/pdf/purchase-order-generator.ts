// lib/pdf/document-builder.ts
import { jsPDF } from "jspdf";

export interface DocumentSection {
  title: string;
  content: string | string[];
  type: "text" | "table";
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export interface DocumentOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  footer?: string;
  sections: DocumentSection[];
  metadata?: Record<string, string>;
}

export class DocumentBuilder {
  private doc: jsPDF;
  private options: DocumentOptions;
  private currentY: number = 20;
  private pageMargin = 14;
  private pageWidth = 210;

  constructor(options: DocumentOptions) {
    this.options = options;
    this.doc = new jsPDF();
  }

  private drawLine(y: number): void {
    this.doc.setLineWidth(0.2);
    this.doc.line(this.pageMargin, y, this.pageWidth - this.pageMargin, y);
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > 280) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  private renderTextSection(section: DocumentSection): void {
    this.checkPageBreak(10);
    
    // Title
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(section.title, this.pageMargin, this.currentY);
    this.currentY += 6;
    
    // Content
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    
    const content = Array.isArray(section.content) ? section.content : [section.content];
    content.forEach((line) => {
      const splitLines = this.doc.splitTextToSize(line, this.pageWidth - this.pageMargin * 2);
      splitLines.forEach((text: string) => {
        this.doc.text(text, this.pageMargin, this.currentY);
        this.currentY += 5;
      });
    });
    
    this.currentY += 4;
  }

  private renderTableSection(section: DocumentSection): void {
    const tableData = section.tableData!;
    const requiredSpace = 20 + (tableData.rows.length * 10);
    
    this.checkPageBreak(requiredSpace);
    
    // Title
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(section.title, this.pageMargin, this.currentY);
    this.currentY += 8;
    
    // Headers
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");
    const colWidths = this.calculateColumnWidths(tableData);
    
    let x = this.pageMargin;
    tableData.headers.forEach((header, index) => {
      this.doc.text(header, x, this.currentY);
      x += colWidths[index];
    });
    
    this.currentY += 2;
    this.drawLine(this.currentY);
    this.currentY += 4;
    
    // Rows
    this.doc.setFont("helvetica", "normal");
    tableData.rows.forEach((row) => {
      x = this.pageMargin;
      row.forEach((cell, index) => {
        const wrappedText = this.doc.splitTextToSize(cell, colWidths[index]);
        this.doc.text(wrappedText, x, this.currentY);
        x += colWidths[index];
      });
      this.currentY += Math.max(6, this.doc.getTextDimensions(row[0] || "").h + 2);
    });
    
    this.currentY += 4;
  }

  private calculateColumnWidths(tableData: { headers: string[]; rows: string[][] }): number[] {
    const totalWidth = this.pageWidth - this.pageMargin * 2;
    const colCount = tableData.headers.length;
    const baseWidth = totalWidth / colCount;
    
    return tableData.headers.map(() => baseWidth);
  }

  private renderHeader(): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(this.options.title, this.pageMargin, this.currentY);
    this.currentY += 8;
    
    if (this.options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(this.options.subtitle, this.pageMargin, this.currentY);
      this.currentY += 8;
    }
    
    // Metadata
    if (this.options.metadata) {
      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");
      Object.entries(this.options.metadata).forEach(([key, value]) => {
        this.doc.text(`${key}: ${value}`, this.pageMargin, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 4;
    }
    
    this.drawLine(this.currentY);
    this.currentY += 8;
    
    if (this.options.companyName) {
      this.doc.setFontSize(11);
      this.doc.setFont("helvetica", "italic");
      this.doc.text(this.options.companyName, this.pageWidth - this.pageMargin, this.pageMargin, { align: "right" });
    }
  }

  private renderFooter(): void {
    if (this.options.footer) {
      this.doc.setFontSize(8);
      this.doc.setFont("helvetica", "italic");
      this.doc.text(
        this.options.footer,
        this.pageWidth / 2,
        290,
        { align: "center" }
      );
    }
  }

  public generate(): jsPDF {
    this.renderHeader();
    
    this.options.sections.forEach((section) => {
      if (section.type === "text") {
        this.renderTextSection(section);
      } else if (section.type === "table") {
        this.renderTableSection(section);
      }
    });
    
    this.renderFooter();
    return this.doc;
  }

  public save(filename: string): void {
    this.generate().save(filename);
  }

  public getBlob(): Blob {
    return this.generate().output("blob");
  }

  public getUint8Array(): Uint8Array {
    const pdfData = this.generate().output("arraybuffer");
    return new Uint8Array(pdfData);
  }
}