// app/dashboard/proposals/[proposalId]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, DollarSign, Building, Download, CheckCircle2, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProposalEditorForm } from "@/components/proposals/proposal-editor-form";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { AcceptProposalButton } from "@/components/proposals/accept-proposal-button";

interface PageProps {
  params: Promise<{ proposalId: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return notFound();
  }

  const { proposalId } = await params;

  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    include: {
      lineItems: { orderBy: { createdAt: "asc" } },
      contract: {
        select: {
          id: true,
          contractNo: true,
          status: true,
          projects: { select: { id: true, name: true } },
        },
      },
      opportunity: {
        select: {
          id: true,
          name: true,
          agencyId: true,
          budget: true,
          currency: true,
          stage: true,
          owner: { select: { id: true, name: true, email: true } },
          agency: { select: { agencyName: true, defaultCurrency: true } },
          lead: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
        },
      },
    },
  });

  if (!proposal || proposal.agencyId !== session.user.agencyId) {
    return notFound();
  }

  const isAccepted = proposal.status === "ACCEPTED";
  const linkedContract = proposal.contract;
  const linkedProject = linkedContract?.projects?.[0];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href={`/dashboard/opportunities/${proposal.opportunityId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Opportunity
      </Link>

      

      {/* Proposal Header Metadata */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-100">
                {proposal.proposalNo || `Proposal #${proposal.id.slice(0, 8)}`}
              </h1>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                {proposal.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-zinc-500" />
              {proposal.opportunity.agency.agencyName}
              {proposal.opportunity.lead?.companyName && (
                <span> → {proposal.opportunity.lead.companyName}</span>
              )}
            </p>
            {proposal.opportunity.owner?.name && (
              <p className="text-xs text-zinc-500 mt-1">
                Owner: {proposal.opportunity.owner.name}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/api/proposals/${proposal.id}/pdf`}
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-md px-3 py-2 hover:bg-zinc-800/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </Link>

            <SendProposalButton
              proposalId={proposal.id}
              currentStatus={proposal.status}
              hasValidUntil={!!proposal.validUntil}
            />

            {!isAccepted && (
              <AcceptProposalButton proposalId={proposal.id} />
            )}
          </div>
        </div>

        {/* Contract & Project Conversion Banner if Accepted */}
        {isAccepted && linkedContract && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Converted to Contract: {linkedContract.contractNo}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Carried over client scope, currency, and total value (${proposal.totalAmount.toLocaleString()}).
                </p>
              </div>
            </div>

            {linkedProject && (
              <Link
                href={`/dashboard/projects/${linkedProject.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-md hover:bg-emerald-400 transition-colors font-semibold"
              >
                <Briefcase className="w-3.5 h-3.5" /> View Project ({linkedProject.name})
              </Link>
            )}
          </div>
        )}

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Amount
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {proposal.currency} {proposal.totalAmount.toLocaleString()}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Valid Until
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {proposal.validUntil
                ? new Date(proposal.validUntil).toLocaleDateString()
                : "No expiration set"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" /> Line Items
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {proposal.lineItems.length} items
            </p>
          </div>
        </div>

        {/* Contact snapshot */}
        {proposal.opportunity.lead && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-500 block mb-0.5">Contact</span>
              <span className="text-zinc-200">
                {proposal.opportunity.lead.contactName || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-0.5">Email</span>
              <span className="text-zinc-200">
                {proposal.opportunity.lead.contactEmail || "N/A"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Form Component for Editing Sections & Line Items */}
      <ProposalEditorForm initialProposal={proposal} />
    </div>
  );
}