import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LeadInteractionsTimeline } from "@/components/leads/lead-interactions-timeline";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadStatusSelect } from "@/components/leads/lead-status-select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Building,
  Mail,
  Phone,
  Tag,
  Wallet,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      opportunity: {
        select: { id: true, name: true, stage: true, budget: true },
      },
      interactions: {
        orderBy: { occurredAt: "desc" },
        include: { createdBy: true },
      },
    },
  });

  if (!lead || lead.deletedAt) return notFound();

  const displayName = lead.companyName || lead.contactName || "Lead Details";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Top Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-100">{displayName}</h1>
              {lead.leadNo && (
                <Badge variant="secondary" className="font-mono">
                  #{lead.leadNo}
                </Badge>
              )}
            </div>
            {lead.industry && (
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-zinc-500" />
                {lead.industry}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <LeadStatusBadge status={lead.status} />
            <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
          </div>
        </div>

        {/* Quick Contact & Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="truncate">{lead.contactEmail || "No Email"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>{lead.contactPhone || "No Phone"}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="truncate">
              Contact: {lead.contactName || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>Source: {lead.source}</span>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Financials, Notes, Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Metrics / Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Estimated Budget
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {lead.estimatedBudget
                  ? `${lead.estimatedBudget.toLocaleString()} ${lead.currency}`
                  : "N/A"}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                <Calendar className="w-4 h-4 text-amber-400" />
                Expected Close Date
              </div>
              <p className="text-xl font-bold text-zinc-100">
                {lead.expectedCloseDate
                  ? new Date(lead.expectedCloseDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Disqualification Reason Callout */}
          {lead.status === "DISQUALIFIED" && lead.disqualifiedReason && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5 space-y-1 text-red-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Disqualification Reason
              </div>
              <p className="text-sm text-red-300">{lead.disqualifiedReason}</p>
            </div>
          )}

          {/* Notes Section */}
          {lead.notes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-semibold text-zinc-300">Notes</h3>
              <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Interaction Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-zinc-100">
              Interaction Timeline
            </h2>
            <LeadInteractionsTimeline
              leadId={lead.id}
              initialInteractions={lead.interactions}
            />
          </div>
        </div>

        {/* Right Column: Meta Info & Opportunity */}
        <div className="space-y-6">
          {/* Lead Assignment Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
              Assignment & Meta
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-zinc-500 block">Lead Owner</span>
                <span className="text-zinc-200 font-medium">
                  {lead.owner ? lead.owner.name : "Unassigned"}
                </span>
                {lead.owner?.email && (
                  <span className="text-xs text-zinc-400 block">
                    {lead.owner.email}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Created On</span>
                <span className="text-zinc-300">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Last Updated</span>
                <span className="text-zinc-300">
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {lead.convertedAt && (
                <div>
                  <span className="text-xs text-zinc-500 block">Converted On</span>
                  <span className="text-zinc-300">
                    {new Date(lead.convertedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Opportunity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
              Opportunity Info
            </h3>
            {lead.opportunity ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-100">
                  {lead.opportunity.name}
                </p>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Stage:{" "}
                    <strong className="text-zinc-200">
                      {lead.opportunity.stage}
                    </strong>
                  </span>
                  {lead.opportunity.budget && (
                    <span>
                      Budget: {lead.opportunity.budget.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                No active opportunity associated with this lead.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}