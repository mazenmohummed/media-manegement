// app/dashboard/proposals/page.tsx
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Calendar, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProposalStatus } from "@prisma/client";

// Define the columns for our proposal board
const BOARD_COLUMNS: { label: string; statuses: ProposalStatus[]; color: string }[] = [
  { label: "Draft", statuses: [ProposalStatus.DRAFT], color: "border-purple-500/30 bg-purple-500/5 text-purple-400" },
  { label: "Sent", statuses: [ProposalStatus.SENT], color: "border-blue-500/30 bg-blue-500/5 text-blue-400" },
  { label: "Under Review", statuses: [ProposalStatus.UNDER_REVIEW], color: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
  { label: "Accepted", statuses: [ProposalStatus.ACCEPTED], color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" },
  { label: "Rejected / Expired", statuses: [ProposalStatus.REJECTED, ProposalStatus.EXPIRED], color: "border-zinc-700 bg-zinc-800/40 text-zinc-400" },
];

function getStatusBadgeClass(status: ProposalStatus) {
  switch (status) {
    case ProposalStatus.DRAFT:
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case ProposalStatus.SENT:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case ProposalStatus.UNDER_REVIEW:
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case ProposalStatus.ACCEPTED:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case ProposalStatus.REJECTED:
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case ProposalStatus.EXPIRED:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export default async function ProposalsPageIndex() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return notFound();
  }

  const proposals = await db.proposal.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      opportunity: { select: { id: true, name: true } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[96rem] mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Proposals Board</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track and manage commercial proposals across your pipeline stages.
          </p>
        </div>
      </div>

      {proposals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {BOARD_COLUMNS.map((col) => {
            const columnProposals = proposals.filter((p) => col.statuses.includes(p.status));

            return (
              <div
                key={col.label}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3 min-h-[600px]"
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between border-b pb-3 px-1 ${col.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono">
                    {columnProposals.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex flex-col gap-3 flex-1">
                  {columnProposals.map((prop) => (
                    <Link
                      key={prop.id}
                      href={`/dashboard/proposals/${prop.id}`}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all rounded-lg p-4 space-y-3 shadow-sm block group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-semibold text-zinc-100 group-hover:text-purple-400 transition-colors line-clamp-1">
                          {prop.proposalNo || `Proposal #${prop.id.slice(0, 8)}`}
                        </h2>
                        <Badge className={`font-mono text-[10px] px-1.5 py-0.5 ${getStatusBadgeClass(prop.status)}`}>
                          {prop.status}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 line-clamp-1">
                        <Building className="w-3 h-3 text-zinc-500 shrink-0" />
                        {prop.opportunity.name}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px]">
                        <span className="font-bold font-mono text-zinc-200">
                          {prop.currency} {prop.totalAmount.toLocaleString()}
                        </span>
                        <span className="text-zinc-500 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" />
                          {prop.lineItems.length}
                        </span>
                      </div>

                      {prop.validUntil && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 pt-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          Valid: {new Date(prop.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  ))}

                  {columnProposals.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-900 rounded-lg p-6 text-center">
                      <p className="text-xs text-zinc-600">No proposals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-200">No proposals found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Create proposals directly from individual opportunity detail views to attach scopes, terms, and line items.
          </p>
        </div>
      )}
    </div>
  );
}