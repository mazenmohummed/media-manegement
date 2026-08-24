// lib/pdf/quotation-generator.ts
import { jsPDF } from "jspdf";

export async function generateQuotationPdf(quotation: any): Promise<Buffer> {
  const doc = new jsPDF();
  let currentY = 20;

  // Header / Agency Name
  doc.setFontSize(20);
  doc.text(quotation.agency?.agencyName || "Agency Quotation", 14, currentY);
  currentY += 10;

  // Quotation Meta Details
  doc.setFontSize(11);
  doc.text(`Quotation No: ${quotation.quotationNo || quotation.id.slice(0, 8)}`, 14, currentY);
  currentY += 7;
  doc.text(`Status: ${quotation.status}`, 14, currentY);
  currentY += 7;
  doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 14, currentY);
  currentY += 7;

  if (quotation.validUntil) {
    doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`, 14, currentY);
    currentY += 7;
  }

  // Linked Project Info (if any)
  if (quotation.project) {
    doc.text(`Project: ${quotation.project.name} (${quotation.project.projectNo || ''})`, 14, currentY);
    currentY += 7;
  }

  currentY += 4;

  // Description & Scope Section
  if (quotation.description) {
    doc.setFontSize(12);
    doc.text("Scope & Description:", 14, currentY);
    currentY += 6;
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(quotation.description, 180);
    doc.text(splitDesc, 14, currentY);
    currentY += splitDesc.length * 5 + 6;
  }

  // Track calculated total from items
  let calculatedTotal = 0;

  // Planned Purchase Orders & Items Section (Client-facing breakdown)
  if (quotation.plannedOrders && quotation.plannedOrders.length > 0) {
    doc.setFontSize(13);
    doc.text("Quotation Items & Breakdown", 14, currentY);
    currentY += 8;

    quotation.plannedOrders.forEach((ppo: any, index: number) => {
      doc.setFontSize(11);
      doc.text(`Package / Order #${index + 1} (${ppo.plannedPoNo || ppo.id.slice(0, 8)})`, 14, currentY);
      currentY += 6;

      if (ppo.items && ppo.items.length > 0) {
        doc.setFontSize(9);
        doc.text("Description", 16, currentY);
        doc.text("Qty", 125, currentY, { align: "right" });
        doc.text("Unit Price", 155, currentY, { align: "right" });
        doc.text("Total", 190, currentY, { align: "right" });
        currentY += 4;

        doc.setLineWidth(0.2);
        doc.line(14, currentY, 196, currentY);
        currentY += 5;

        ppo.items.forEach((item: any) => {
          const itemTotal = item.total || (item.quantity * item.unitCost);
          calculatedTotal += itemTotal;

          const descLines = doc.splitTextToSize(item.description, 95);
          doc.text(descLines, 16, currentY);
          doc.text(String(item.quantity), 125, currentY, { align: "right" });
          doc.text(item.unitCost.toLocaleString(), 155, currentY, { align: "right" });
          doc.text(itemTotal.toLocaleString(), 190, currentY, { align: "right" });
          
          currentY += Math.max(descLines.length * 4, 6);

          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
        });
      }
      currentY += 4;
    });
  }

  // Fallback to quotation.amount if no line items exist
  const finalAmount = calculatedTotal > 0 ? calculatedTotal : (quotation.amount || 0);

  // Total Amount Footer Summary
  currentY += 6;
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.text(
    `Total Amount: ${quotation.currency} ${finalAmount.toLocaleString()}`,
    14,
    currentY
  );

  // Output as Buffer for server download route
  const pdfOutput = Buffer.from(doc.output("arraybuffer"));
  return pdfOutput;
}