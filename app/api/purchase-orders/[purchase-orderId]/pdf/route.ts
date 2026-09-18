// app/api/purchase-orders/[poId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { generatePurchaseOrderPdf } from "@/lib/pdf/purchase-order-generator";
import { InvoiceGenerator } from "@/lib/pdf/invoice-generator";

// ─── Helper to convert Uint8Array → NextResponse-safe body ──────────────
function pdfResponse(pdfBytes: Uint8Array, filename: string) {
  // ✅ Blob is accepted by BodyInit, works in Node & Edge runtime
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBytes.byteLength.toString(),
    },
  });
}

// ─── GET /api/purchase-orders/[poId]/pdf ────────────────────────────────
export const GET = withAuthGuard(
  "purchase:read",
  async (req: NextRequest, { agencyId }, context) => {
    try {
      const params = await context.params;
      const poId = params.poId;

      const db = getScopedPrisma(agencyId);

      // ── Fetch purchase order with all required relations ─────────────
      const purchaseOrder = await db.purchaseOrder.findFirst({
        where: {
          id: poId,
          agencyId,
        },
        include: {
          vendor: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
              taxNumber: true,
              address: {
                select: {
                  line1: true,
                  line2: true,
                  city: true,
                  state: true,
                  postalCode: true,
                  country: true,
                },
              },
            },
          },
          items: {
            orderBy: { createdAt: "asc" },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectName: true,
            },
          },
          quotation: {
            select: {
              id: true,
              quotationNo: true,
              amount: true,
              status: true,
            },
          },
          agency: {
            select: {
              id: true,
              agencyName: true,
              email: true,
              phoneNumber: true,
              address: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }

      const filename = `PO-${
        purchaseOrder.poNo || purchaseOrder.id.slice(0, 8)
      }.pdf`;

      // ── Try the dedicated PO generator first ─────────────────────────
      try {
        const pdfBytes = await generatePurchaseOrderPdf(purchaseOrder);
        return pdfResponse(pdfBytes, filename);
      } catch (pdfError) {
        console.warn("[PDF_GENERATOR_FALLBACK]:", pdfError);

        // ── Fallback: Use InvoiceGenerator ─────────────────────────────
        const pdfData = {
          docType: "PURCHASE ORDER",
          docNumber: purchaseOrder.poNo || purchaseOrder.id.slice(0, 8),
          agencyName: purchaseOrder.agency?.agencyName || "Agency OS",
          clientName: purchaseOrder.vendor?.name || "Vendor",
          issueDate: new Date(purchaseOrder.createdAt),
          validUntil: purchaseOrder.expectedDeliveryDate || null,
          currency: purchaseOrder.currency || "EGP",
          lineItems: purchaseOrder.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitCost,
            total: item.total,
          })),
          totalAmount: purchaseOrder.totalAmount,
          notes: [
            purchaseOrder.notes || "Thank you for your order!",
            ...(purchaseOrder.project?.name
              ? [`Project: ${purchaseOrder.project.name}`]
              : []),
            ...(purchaseOrder.quotation?.quotationNo
              ? [`Quotation: ${purchaseOrder.quotation.quotationNo}`]
              : []),
          ],
        };

        const generator = new InvoiceGenerator(pdfData as any);
        const pdfBytes = generator.getUint8Array();

        return pdfResponse(pdfBytes, filename);
      }
    } catch (error: any) {
      console.error("[GENERATE_PO_PDF_ERROR]:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate PDF" },
        { status: 500 }
      );
    }
  }
);