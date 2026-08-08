// app/dashboard/opportunities/page.tsx
import { db } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  Plus,
  Briefcase,
  DollarSign,
  Calendar,
  ArrowRight,
  Building,
  UserCog,
} from "lucide-react";
import { OpportunityStage } from "@prisma/client";

const STAGES: { key: OpportunityStage; label: string; color: string }[] = [
  { key: OpportunityStage.QUALIFICATION, label: "Qualification", color: "border-sky-500/40 text-sky-400 bg-sky-500/10" },
  { key: OpportunityStage.DISCOVERY, label: "Discovery", color: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
  { key: OpportunityStage.STRATEGY, label: "Strategy", color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10" },
  { key: OpportunityStage.PROPOSAL, label: "Proposal", color: "border-purple-500/40 text-purple-400 bg-purple-500/10" },
  { key: OpportunityStage.NEGOTIATION, label: "Negotiation", color: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
  { key: OpportunityStage.WON, label: "Closed Won", color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
  { key: OpportunityStage.LOST, label: "Closed Lost", color: "border-zinc-500/40 text-zinc-400 bg-zinc-500/10" },
];

export default async function OpportunitiesPage() {
  const session = await getServerSession(authOptions);
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-zinc-400">Unauthorized. Please sign in.</p>
      </div>
    );
  }

  const opportunities = await db.opportunity.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, clientName: true, clientNo: true } },
      user: { select: { id: true, name: true, role: true } },
      lead: {
        select: {
          companyName: true,
          contactName: true,
        },
      },
    },
  });

  const totalPipelineValue = opportunities.reduce(
    (sum, opp) => sum + (opp.budget || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-purple-400" />
            Opportunities Pipeline
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Total Pipeline Value:{" "}
            <span className="text-emerald-400 font-semibold">
              EGP {totalPipelineValue.toLocaleString()}
            </span>
          </p>
        </div>

        <Link
          href="/dashboard/opportunities/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
        >
          <Plus className="w-4 h-4" /> New Opportunity
        </Link>
      </div>

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto pb-6">
        {STAGES.map((stage) => {
          const stageDeals = opportunities.filter((o) => o.stage === stage.key);
          const stageTotal = stageDeals.reduce(
            (acc, o) => acc + (o.budget || 0),
            0
          );

          return (
            <div
              key={stage.key}
              className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-w-[260px] space-y-4"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${stage.color}`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-xs text-zinc-500">
                    ({stageDeals.length})
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  EGP {stageTotal.toLocaleString()}
                </span>
              </div>

              {/* Deal Cards */}
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                {stageDeals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-600 italic border border-dashed border-zinc-900 rounded-lg">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/dashboard/opportunities/${deal.id}`}
                      className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 space-y-3 transition-all shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors line-clamp-2">
                          {deal.name}
                        </h4>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400 transition-colors shrink-0 mt-0.5" />
                      </div>

                      {/* Client / Owner */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">
                          {deal.client?.clientName ||
                            deal.lead?.companyName ||
                            "No client"}
                        </span>
                      </div>

                      {/* Assigned Employee */}
                      {deal.user && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <UserCog className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          <span className="truncate">
                            {deal.user.name} ({deal.user.role})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
                        <span className="font-semibold text-emerald-400 flex items-center gap-0.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          {deal.budget
                            ? `${deal.currency} ${deal.budget.toLocaleString()}`
                            : "N/A"}
                        </span>
                        {deal.expectedCloseDate && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(deal.expectedCloseDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}