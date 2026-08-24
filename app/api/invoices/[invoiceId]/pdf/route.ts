import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { generateInvoicePdf } from "@/lib/pdf/invoice-generator";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

// GET /api/invoices/[invoiceId]/pdf - Export invoice as PDF
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const { invoiceId } = await params;

  try {
    const invoice = await db.clientInvoice.findUnique({
      where: { id: invoiceId, agencyId },
      include: {
        client: true,
        agency: { 
          select: { 
            agencyName: true, 
            phoneNumber: true, 
            billingAddress: true 
          } 
        },
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Generate PDF buffer using your PDF pipeline
    const pdfBuffer = await generateInvoicePdf(invoice);

    // Convert Uint8Array to ArrayBuffer for Next.js response compatibility
    const responseBody = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset, 
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );

   return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNo || invoice.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF Export error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate invoice PDF" }, { status: 500 });
  }
}