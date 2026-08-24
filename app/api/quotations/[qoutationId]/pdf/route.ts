// app/api/quotations/[qoutationId]/pdf/route.ts
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";
import { generateQuotationPdf } from "@/lib/pdf/quotation-generator";

interface RouteParams {
  params: Promise<{ qoutationId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { qoutationId } = await params;
  const agencyId = session.user.agencyId;

  const quotation = await db.quotation.findUnique({
    where: { id: qoutationId },
    include: {
      vendor: true,
      vendors: { include: { vendor: true } },
      project: true,
      agency: true,
      purchaseOrders: { include: { items: true } },
      plannedOrders: { include: { items: true } },
    },
  });

  if (!quotation || quotation.agencyId !== agencyId) {
    return notFound();
  }

  const pdfBuffer = await generateQuotationPdf(quotation);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Quotation-${quotation.quotationNo || quotation.id.slice(0, 8)}.pdf"`,
    },
  });
}