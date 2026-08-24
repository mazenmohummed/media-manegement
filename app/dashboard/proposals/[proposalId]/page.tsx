import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Building,
  Download,
  CheckCircle2,
  Briefcase,
  UserCog,
  ExternalLink,
  Layers,
  AlertCircle,
  Target,
  Users,
  MessageSquare,
  Package,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProposalEditorForm } from "@/components/proposals/proposal-editor-form";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { AcceptProposalButton } from "@/components/proposals/accept-proposal-button";
import { ConvertToProjectButton } from "./convert-button";

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
      client: { select: { id: true, clientName: true, email: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
      contract: {
        select: {
          id: true,
          contractNo: true,
          status: true,
          startDate: true,
          monthlyValue: true,
          projects: { select: { id: true, name: true } },
        },
      },
      opportunity: {
        include: {
          personas: true,
          competitors: true,
          products: true,
          client: { select: { id: true, clientName: true, email: true } },
          user: { select: { id: true, name: true, email: true, role: true } },
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

  // Fetch available templates for the Accept flow
  const templates = await db.projectTemplate.findMany({
    where: { agencyId: session.user.agencyId },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const linkedClient = proposal.client || proposal.opportunity.client;
  const assignedEmployee = proposal.user || proposal.opportunity.user;

  const isAccepted = proposal.status === "ACCEPTED";
  const isConverted = !!proposal.contractId;
  const canConvert = isAccepted && !isConverted;
  const linkedContract = proposal.contract;
  const linkedProject = linkedContract?.projects?.[0];

  // Pre-compute Creative Brief preview from Opportunity discovery data
  const opp = proposal.opportunity;
  const briefPreview = opp
    ? {
        objectives: [
          opp.companyMission ? `Mission: ${opp.companyMission}` : null,
          opp.marketingStrategy
            ? `Marketing Strategy: ${opp.marketingStrategy}`
            : null,
          opp.launchStrategy ? `Launch: ${opp.launchStrategy}` : null,
          opp.kpis?.length
            ? `KPIs:\n${opp.kpis.map((k) => `• ${k}`).join("\n")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        audience: [
          ...(opp.personas?.map((p) => {
            const parts = [`${p.name}`];
            if (p.demographics) parts.push(`Demographics: ${p.demographics}`);
            if (p.psychographics)
              parts.push(`Psychographics: ${p.psychographics}`);
            if (p.buyingBehavior) parts.push(`Behavior: ${p.buyingBehavior}`);
            if (p.goals) parts.push(`Goals: ${p.goals}`);
            if (p.frustrations) parts.push(`Pain Points: ${p.frustrations}`);
            return parts.join(" | ");
          }) ?? []),
          opp.marketResearchNotes
            ? `Research Notes: ${opp.marketResearchNotes}`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        keyMessage:
          opp.brandValues ||
          opp.communicationStrategy ||
          opp.creativeStrategy ||
          null,
        deliverables:
          opp.products?.map((p) => {
            const parts = [p.name];
            if (p.usp) parts.push(`USP: ${p.usp}`);
            if (p.painPoints) parts.push(`Pain Points: ${p.painPoints}`);
            return parts.join(" — ");
          }) ?? [],
        references:
          opp.competitors?.map((c) => {
            const parts = [c.name];
            if (c.strengths) parts.push(`Strengths: ${c.strengths}`);
            if (c.weaknesses) parts.push(`Weaknesses: ${c.weaknesses}`);
            return parts.join(" | ");
          }) ?? [],
      }
    : null;

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
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">
                {proposal.proposalNo || `Proposal #${proposal.id.slice(0, 8)}`}
              </h1>
              <Badge
                className={
                  proposal.status === "ACCEPTED"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono"
                    : proposal.status === "REJECTED"
                    ? "bg-red-500/10 text-red-400 border-red-500/20 font-mono"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono"
                }
              >
                {proposal.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-zinc-500" />
              {proposal.opportunity.agency.agencyName}
              {linkedClient?.clientName && (
                <span> → {linkedClient.clientName}</span>
              )}
            </p>
            {linkedClient?.email && (
              <p className="text-xs text-zinc-500 mt-1">
                Client: {linkedClient.email}
              </p>
            )}
            {assignedEmployee && (
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <UserCog className="w-3 h-3" />
                Assigned: {assignedEmployee.name} ({assignedEmployee.role})
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
              <AcceptProposalButton
                proposalId={proposal.id}
                templates={templates}
              />
            )}

            {canConvert && <ConvertToProjectButton proposalId={proposal.id} />}

            {isConverted && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Converted
              </Badge>
            )}
          </div>
        </div>

        {/* Contract & Project Conversion Banner */}
        {isAccepted && linkedContract && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Converted to Contract: {linkedContract.contractNo}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Carried over client scope, currency, and total value (
                  {proposal.currency} {proposal.totalAmount.toLocaleString()}).
                </p>
              </div>
            </div>

            {linkedProject ? (
              <Link
                href={`/dashboard/projects/${linkedProject.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-md hover:bg-emerald-400 transition-colors font-semibold"
              >
                <Briefcase className="w-3.5 h-3.5" /> View Project (
                {linkedProject.name})
              </Link>
            ) : (
              <span className="text-[11px] text-zinc-500">
                No project spun up yet.
              </span>
            )}
          </div>
        )}

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total
              Amount
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

        {/* Opportunity Context Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 block mb-0.5">Opportunity</span>
            <Link
              href={`/dashboard/opportunities/${proposal.opportunity.id}`}
              className="text-zinc-200 hover:text-purple-300 transition-colors font-medium"
            >
              {proposal.opportunity.name}
            </Link>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Contact</span>
            <span className="text-zinc-200">
              {proposal.opportunity.lead?.contactName || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Email</span>
            <span className="text-zinc-200">
              {proposal.opportunity.lead?.contactEmail || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">
              Assigned Employee
            </span>
            <span className="text-zinc-200 flex items-center gap-1">
              <UserCog className="w-3 h-3 text-zinc-600" />
              {assignedEmployee
                ? `${assignedEmployee.name} (${assignedEmployee.role})`
                : "Unassigned"}
            </span>
          </div>
        </div>
      </div>

      {/* Template Hint (only if not accepted) */}
      {!isAccepted && templates.length > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300">
            <p className="font-medium text-blue-400 mb-1">
              {templates.length} project template
              {templates.length !== 1 ? "s" : ""} available
            </p>
            <p className="text-zinc-400">
              When you accept this proposal, you can pick a template to
              instantly generate the full milestone and task structure. No
              manual task creation needed.
            </p>
          </div>
        </div>
      )}

      {/* Conversion Preview — show when accepted but not yet converted */}
      {canConvert && briefPreview && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Auto-Generated Creative Brief Preview
          </h3>
          <p className="text-xs text-zinc-500">
            This will be created automatically from the Opportunity discovery
            data when you launch the project. You can edit it afterwards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {briefPreview.objectives && (
              <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 font-medium block mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Objectives
                </span>
                <p className="text-zinc-300 whitespace-pre-wrap line-clamp-6">
                  {briefPreview.objectives}
                </p>
              </div>
            )}
            {briefPreview.audience && (
              <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 font-medium block mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Audience
                </span>
                <p className="text-zinc-300 whitespace-pre-wrap line-clamp-6">
                  {briefPreview.audience}
                </p>
              </div>
            )}
            {briefPreview.keyMessage && (
              <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 font-medium block mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Key Message
                </span>
                <p className="text-zinc-300 whitespace-pre-wrap line-clamp-6">
                  {briefPreview.keyMessage}
                </p>
              </div>
            )}
            {briefPreview.deliverables.length > 0 && (
              <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 font-medium block mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Deliverables
                </span>
                <ul className="text-zinc-300 list-disc list-inside space-y-0.5">
                  {briefPreview.deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cannot convert warning */}
      {!isAccepted && !isConverted && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Proposal Not Accepted
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              This proposal must be marked as ACCEPTED before it can be
              converted into a contract and project.
            </p>
          </div>
        </div>
      )}

      {/* Linked Records deep-dive (post-conversion) */}
      {isConverted && linkedContract && (
        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-emerald-300 border-b border-emerald-900/50 pb-2 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Linked Records
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-emerald-600/80 block">
                Contract
              </span>
              <Link
                href={`/dashboard/contracts/${linkedContract.id}`}
                className="font-medium text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                {linkedContract.contractNo || "View Contract"}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div>
              <span className="text-xs text-emerald-600/80 block">
                Status
              </span>
              <span className="text-emerald-200">
                {linkedContract.status} · Started{" "}
                {linkedContract.startDate
                  ? new Date(linkedContract.startDate).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Editor */}
      <ProposalEditorForm initialProposal={proposal} />
    </div>
  );
}