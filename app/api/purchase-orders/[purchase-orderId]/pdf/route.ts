// app/api/purchase-orders/[purchase-orderId]/pdf/route.ts
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";
import { generatePurchaseOrderPdf } from "@/lib/pdf/purchase-order-generator";

interface RouteParams {
  params: Promise<{ "purchase-orderId": string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  // Destructure using the exact folder name matching your route path
  const resolvedParams = await params;
  const id = resolvedParams["purchase-orderId"];
  const agencyId = session.user.agencyId;

  if (!id) return notFound();

  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      agency: true,
      project: true,
      quotation: true,
      items: true,
    },
  });

  if (!purchaseOrder || purchaseOrder.agencyId !== agencyId) {
    return notFound();
  }

  const pdfBuffer = await generatePurchaseOrderPdf(purchaseOrder);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PO-${purchaseOrder.poNo || purchaseOrder.id.slice(0, 8)}.pdf"`,
    },
  });
}