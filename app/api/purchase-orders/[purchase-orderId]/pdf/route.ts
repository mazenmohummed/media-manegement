// app/api/purchase-orders/[poId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";
import { generatePurchaseOrderPdf } from "@/lib/pdf/purchase-order-generator";
import { InvoiceGenerator } from "@/lib/pdf/invoice-generator";

// ─── GET /api/purchase-orders/[poId]/pdf ──────────────────────────────────────
export const GET = withAuthGuard("purchase:read", async (req: NextRequest, { agencyId }, context) => {
  try {
    const params = await context.params;
    const poId = params.poId;

    const db = getScopedPrisma(agencyId);

    // ── Fetch purchase order with all required relations ────────────────────
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

    // ── Generate PDF ──────────────────────────────────────────────────────────
    // Try using the dedicated purchase order generator first
    try {
      const pdfBytes = await generatePurchaseOrderPdf(purchaseOrder);
      
      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="PO-${purchaseOrder.poNo || purchaseOrder.id.slice(0, 8)}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.warn("[PDF_GENERATOR_FALLBACK]:", pdfError);
      
      // ── Fallback: Use InvoiceGenerator if dedicated generator fails ──────
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
          ...(purchaseOrder.project?.name ? [`Project: ${purchaseOrder.project.name}`] : []),
          ...(purchaseOrder.quotation?.quotationNo ? [`Quotation: ${purchaseOrder.quotation.quotationNo}`] : []),
        ],
      };

      const generator = new InvoiceGenerator(pdfData as any);
      const pdfBytes = generator.getUint8Array();

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="PO-${purchaseOrder.poNo || purchaseOrder.id.slice(0, 8)}.pdf"`,
        },
      });
    }
  } catch (error: any) {
    console.error("[GENERATE_PO_PDF_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
});