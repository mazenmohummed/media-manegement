// lib/pdf/purchase-order-generator.ts
import { jsPDF } from "jspdf";

export async function generatePurchaseOrderPdf(purchaseOrder: any): Promise<Buffer> {
  const doc = new jsPDF();
  let currentY = 20;

  // Header / Agency Name
  doc.setFontSize(20);
  doc.text(purchaseOrder.agency?.agencyName || "Agency Receipt", 14, currentY);
  currentY += 10;

  // Purchase Order Meta Details
  doc.setFontSize(11);
  doc.text(`Purchase Order No: ${purchaseOrder.poNo || purchaseOrder.id.slice(0, 8)}`, 14, currentY);
  currentY += 7;
  doc.text(`Status: ${purchaseOrder.status}`, 14, currentY);
  currentY += 7;
  doc.text(`Date: ${new Date(purchaseOrder.createdAt).toLocaleDateString()}`, 14, currentY);
  currentY += 7;

  if (purchaseOrder.expectedDeliveryDate) {
    doc.text(`Expected Delivery: ${new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString()}`, 14, currentY);
    currentY += 7;
  }

  // Linked Quotation or Project Info
  if (purchaseOrder.quotation) {
    doc.text(`Reference Quotation: ${purchaseOrder.quotation.quotationNo || purchaseOrder.quotation.id.slice(0, 8)}`, 14, currentY);
    currentY += 7;
  }
  if (purchaseOrder.project) {
    doc.text(`Project: ${purchaseOrder.project.name} (${purchaseOrder.project.projectNo || ''})`, 14, currentY);
    currentY += 7;
  }

  currentY += 6;

  // Items Table Header
  doc.setFontSize(13);
  doc.text("Order Items", 14, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.text("Description", 16, currentY);
  doc.text("Qty", 125, currentY, { align: "right" });
  doc.text("Unit Price", 155, currentY, { align: "right" });
  doc.text("Total", 190, currentY, { align: "right" });
  currentY += 4;

  doc.setLineWidth(0.2);
  doc.line(14, currentY, 196, currentY);
  currentY += 5;

  let calculatedTotal = 0;

  // Items List
  if (purchaseOrder.items && purchaseOrder.items.length > 0) {
    purchaseOrder.items.forEach((item: any) => {
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

  // Notes Section (if any)
  if (purchaseOrder.notes) {
    currentY += 6;
    doc.setFontSize(10);
    doc.text("Notes:", 14, currentY);
    currentY += 5;
    const splitNotes = doc.splitTextToSize(purchaseOrder.notes, 180);
    doc.text(splitNotes, 14, currentY);
    currentY += splitNotes.length * 4 + 6;
  }

  // Total Amount Footer Summary
  currentY += 6;
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  const finalAmount = calculatedTotal > 0 ? calculatedTotal : (purchaseOrder.totalAmount || 0);

  doc.setFontSize(14);
  doc.text(
    `Total Amount: ${purchaseOrder.currency} ${finalAmount.toLocaleString()}`,
    14,
    currentY
  );

  // Output as Buffer
  const pdfOutput = Buffer.from(doc.output("arraybuffer"));
  return pdfOutput;
}