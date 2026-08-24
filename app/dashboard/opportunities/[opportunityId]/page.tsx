// app/dashboard/opportunities/[opportunityId]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import {
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  User as UserIcon,
  UserCog,
  ExternalLink,
  Briefcase,
  Compass,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OpportunityStrategyForm } from "@/components/opportunities/opportunity-strategy-form";
import { PersonaManager } from "@/components/opportunities/persona-manager";
import { CompetitorManager } from "@/components/opportunities/competitor-manager";
import { ProductManager } from "@/components/opportunities/product-manager";
import { OpportunityHeaderEditForm } from "@/components/opportunities/opportunity-header-edit-form";
import { CreateProposalButton } from "@/components/opportunities/create-proposal-button";
import { DeleteOpportunityButton } from "@/components/opportunities/delete-opportunity-button";
import { CreateClientButton } from "@/components/opportunities/create-client-button";
import { CreateBriefButton } from "@/components/opportunities/create-brief-button";

const STRATEGY_FIELDS: { key: keyof StrategyFields; label: string }[] = [
  { key: "companyMission", label: "Company Mission" },
  { key: "brandValues", label: "Brand Values" },
  { key: "marketResearchNotes", label: "Market Research Notes" },
  { key: "marketingStrategy", label: "Marketing Strategy" },
  { key: "communicationStrategy", label: "Communication Strategy" },
  { key: "mediaStrategy", label: "Media Strategy" },
  { key: "creativeStrategy", label: "Creative Strategy" },
  { key: "launchStrategy", label: "Launch Strategy" },
];

interface StrategyFields {
  companyMission: string | null;
  brandValues: string | null;
  marketResearchNotes: string | null;
  marketingStrategy: string | null;
  communicationStrategy: string | null;
  mediaStrategy: string | null;
  creativeStrategy: string | null;
  launchStrategy: string | null;
}

const ELIGIBLE_EMPLOYEE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.TEAMLEADER,
  UserRole.CREATIVE,
];

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      lead: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      client: { select: { id: true, clientName: true, email: true, clientNo: true } },
      personas: true,
      competitors: true,
      products: true,
      proposals: {
        select: {
          id: true,
          proposalNo: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          user: { select: { id: true, name: true, role: true } },
          client: { select: { id: true, clientName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!opportunity) return notFound();

  const clients = await db.client.findMany({
    where: { agencyId: opportunity.agencyId },
    select: { id: true, clientName: true, clientNo: true },
    orderBy: { clientName: "asc" },
  });

  const employees = await db.user.findMany({
    where: {
      agencyId: opportunity.agencyId,
      role: { in: ELIGIBLE_EMPLOYEE_ROLES },
      isActive: true,
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/opportunities"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Pipeline
      </Link>

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-100">
                {opportunity.name}
              </h1>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                {opportunity.stage}
              </Badge>
            </div>
            {(opportunity.client?.clientName || opportunity.lead?.companyName) && (
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-zinc-500" />
                {opportunity.client?.clientName || opportunity.lead?.companyName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CreateClientButton
              agencyId={opportunity.agencyId}
              opportunityId={opportunity.id}
            />
            <OpportunityHeaderEditForm
              opportunityId={opportunity.id}
              initialData={{
                name: opportunity.name,
                stage: opportunity.stage,
                budget: opportunity.budget,
                currency: opportunity.currency,
                expectedCloseDate: opportunity.expectedCloseDate
                  ? opportunity.expectedCloseDate.toISOString().split("T")[0]
                  : null,
                userId: opportunity.userId ?? null,
                clientId: opportunity.clientId ?? null,
              }}
              clients={clients}
              employees={employees}
            />
            <DeleteOpportunityButton
              opportunityId={opportunity.id}
              opportunityName={opportunity.name}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Deal Value
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {opportunity.budget
                ? `${opportunity.currency} ${opportunity.budget.toLocaleString()}`
                : "Not set"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Target Close
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {opportunity.expectedCloseDate
                ? new Date(opportunity.expectedCloseDate).toLocaleDateString()
                : "Not scheduled"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-blue-400" /> Opportunity Owner
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1 truncate">
              {opportunity.user?.name || "Unassigned"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <UserCog className="w-3.5 h-3.5 text-purple-400" /> Linked Client
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1 truncate">
              {opportunity.client?.clientName || "No client linked"}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Lead / Client Context */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <span>Relationship & Source Context</span>
          <Briefcase className="w-4 h-4 text-purple-400" />
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-300">
          {opportunity.client && (
            <div>
              <span className="text-xs text-zinc-500 block">Linked Client (Owner)</span>
              <Link
                href={`/dashboard/clients/${opportunity.client.id}`}
                className="font-medium text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                {opportunity.client.clientName}
                {opportunity.client.clientNo ? ` (${opportunity.client.clientNo})` : ""}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {opportunity.lead ? (
            <>
              <div>
                <span className="text-xs text-zinc-500 block">Contact Name</span>
                <span className="font-medium text-zinc-200">
                  {opportunity.lead.contactName || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Email</span>
                <span className="font-medium text-zinc-200">
                  {opportunity.lead.contactEmail || "N/A"}
                </span>
              </div>
              <div className="sm:col-span-2 pt-2">
                <Link
                  href={`/dashboard/leads/${opportunity.lead.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
                >
                  View Source Lead Record <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : !opportunity.client && (
            <p className="text-xs text-zinc-500 italic sm:col-span-2">
              This opportunity has no linked lead or client context.
            </p>
          )}
        </div>
      </div>

      {/* Discovery Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PersonaManager opportunityId={opportunity.id} initialPersonas={opportunity.personas} />
        <CompetitorManager opportunityId={opportunity.id} initialCompetitors={opportunity.competitors} />
        <ProductManager opportunityId={opportunity.id} initialProducts={opportunity.products} />
      </div>

      {/* Strategic Vision */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Strategy & Direction</span>
          </div>
          <div className="flex items-center gap-2">
            <CreateBriefButton opportunityId={opportunity.id} />
            <OpportunityStrategyForm
              opportunityId={opportunity.id}
              initialData={{
                companyMission: opportunity.companyMission,
                brandValues: opportunity.brandValues,
                marketResearchNotes: opportunity.marketResearchNotes,
                marketingStrategy: opportunity.marketingStrategy,
                communicationStrategy: opportunity.communicationStrategy,
                mediaStrategy: opportunity.mediaStrategy,
                creativeStrategy: opportunity.creativeStrategy,
                launchStrategy: opportunity.launchStrategy,
                kpis: opportunity.kpis,
              }}
            />
          </div>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {STRATEGY_FIELDS.map(({ key, label }) => {
            const value = opportunity[key];
            if (!value) return null;
            return (
              <div key={key} className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 font-medium block mb-1">{label}</span>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
              </div>
            );
          })}
        </div>

        {STRATEGY_FIELDS.every(({ key }) => !opportunity[key]) && (
          <p className="text-xs text-zinc-500 italic">
            No strategic direction captured yet. Click "Edit" to add mission, values, research notes, and channel strategies.
          </p>
        )}

        {opportunity.kpis && opportunity.kpis.length > 0 && (
          <div className="pt-2">
            <span className="text-xs text-zinc-500 font-medium block mb-2">Target KPIs</span>
            <div className="flex flex-wrap gap-2">
              {opportunity.kpis.map((kpi, idx) => (
                <Badge key={idx} variant="outline" className="bg-zinc-950 text-zinc-300 border-zinc-800 text-xs">
                  {kpi}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

  
      {/* Associated Proposals */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Proposals</span>
          </div>
          <CreateProposalButton
            opportunityId={opportunity.id}
            opportunityName={opportunity.name}
            budget={opportunity.budget}
            currency={opportunity.currency}
          />
        </h3>

        {opportunity.proposals.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {opportunity.proposals.map((prop) => (
              <Link
                key={prop.id}
                href={`/dashboard/proposals/${prop.id}`}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-zinc-800/40 px-2 rounded-lg transition-colors block"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-zinc-200 block">
                    {prop.proposalNo || `Proposal #${prop.id.slice(0, 8)}`}
                  </span>
                  <span className="text-zinc-500">
                    Created: {new Date(prop.createdAt).toLocaleDateString()}
                  </span>
                  {(prop.user || prop.client) && (
                    <div className="flex items-center gap-2 mt-1.5">
                      {prop.user && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                          {prop.user.name}
                        </span>
                      )}
                      {prop.client && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          {prop.client.clientName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="font-mono text-zinc-200">
                    {prop.currency} {prop.totalAmount.toLocaleString()}
                  </span>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{prop.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No proposals created yet. Click "Create Proposal" to start one.</p>
        )}
      </div>
    </div>
  );
}