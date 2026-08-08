import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { buildDocumentPdf } from "@/lib/pdf/document-builder";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { proposalId } = await params;

  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    include: {
      lineItems: true,
      opportunity: {
        select: {
          name: true,
          agencyId: true,
          agency: { select: { agencyName: true } },
          lead: { select: { companyName: true } },
        },
      },
    },
  });

  if (!proposal || proposal.opportunity.agencyId !== session.user.agencyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await buildDocumentPdf({
    docType: "PROPOSAL",
    docNumber: proposal.proposalNo || proposal.id.slice(0, 8),
    agencyName: proposal.opportunity.agency.agencyName,
    clientName: proposal.opportunity.lead?.companyName ?? proposal.opportunity.name,
    issueDate: proposal.createdAt,
    validUntil: proposal.validUntil,
    currency: proposal.currency,
    lineItems: proposal.lineItems,
    totalAmount: proposal.totalAmount,
    notes: [
      proposal.scope ? `Scope: ${proposal.scope}` : "",
      proposal.risks ? `Risks: ${proposal.risks}` : "",
      proposal.assumptions ? `Assumptions: ${proposal.assumptions}` : "",
      proposal.paymentSchedule ? `Payment Schedule: ${proposal.paymentSchedule}` : "",
    ],
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${proposal.proposalNo || proposal.id}.pdf"`,
    },
  });
}