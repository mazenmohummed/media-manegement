import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  UserCog,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContractStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ contractId: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { contractId } = await params;

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: {
      client: { select: { id: true, clientName: true, email: true, phoneNumber: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
      agency: { select: { agencyName: true, defaultCurrency: true } },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          totalValue: true,
          currency: true,
          targetDeadline: true,
        },
        orderBy: { createdAt: "desc" },
      },
      proposal: {
        select: {
          id: true,
          proposalNo: true,
          totalAmount: true,
          currency: true,
          scope: true,
        },
      },
      recurringInvoiceSchedules: {
        select: { id: true, name: true, amount: true, frequency: true, isActive: true },
      },
    },
  });

  if (!contract || contract.agencyId !== session.user.agencyId) {
    return notFound();
  }

  const isActive = contract.status === ContractStatus.ACTIVE;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Contracts
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">
                {contract.contractNo || `Contract #${contract.id.slice(0, 8)}`}
              </h1>
              <Badge
                className={
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 font-mono"
                }
              >
                {contract.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-zinc-500" />
              {contract.agency.agencyName}
              {contract.client?.clientName && (
                <span> → {contract.client.clientName}</span>
              )}
            </p>
          </div>

          {contract.termsUrl && (
            <a
              href={contract.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-md px-3 py-2 hover:bg-zinc-800/60 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> View Terms
            </a>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monthly Value
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {contract.currency} {contract.monthlyValue?.toLocaleString() ?? "0"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Duration
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {contract.startDate
                ? new Date(contract.startDate).toLocaleDateString()
                : "Not started"}{" "}
              →{" "}
              {contract.endDate
                ? new Date(contract.endDate).toLocaleDateString()
                : "Ongoing"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <UserCog className="w-3.5 h-3.5 text-purple-400" /> Account Manager
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1 truncate">
              {contract.user?.name || "Unassigned"}
            </p>
          </div>
        </div>
      </div>

      {/* Source Proposal */}
      {contract.proposal && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Source Proposal
          </h3>
          <div className="flex items-center justify-between text-sm">
            <div>
              <Link
                href={`/dashboard/proposals/${contract.proposal.id}`}
                className="font-medium text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                {contract.proposal.proposalNo ||
                  `Proposal #${contract.proposal.id.slice(0, 8)}`}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <p className="text-xs text-zinc-500 mt-0.5">
                Value: {contract.proposal.currency}{" "}
                {contract.proposal.totalAmount.toLocaleString()}
              </p>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
            </Badge>
          </div>
          {contract.proposal.scope && (
            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap">
              {contract.proposal.scope}
            </div>
          )}
        </div>
      )}

      {/* Linked Projects */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Generated Projects</span>
          </div>
          <span className="text-xs text-zinc-500 font-normal">
            {contract.projects.length} project
            {contract.projects.length !== 1 ? "s" : ""}
          </span>
        </h3>

        {contract.projects.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {contract.projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-zinc-800/40 px-2 rounded-lg transition-colors block"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">
                    {project.name}
                  </span>
                  <span className="text-zinc-500">
                    Deadline:{" "}
                    {project.targetDeadline
                      ? new Date(project.targetDeadline).toLocaleDateString()
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-200">
                    {project.currency} {project.totalValue.toLocaleString()}
                  </span>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    {project.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">
            No projects linked to this contract yet.
          </p>
        )}
      </div>

      {/* Recurring Schedules */}
      {contract.recurringInvoiceSchedules.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
            Recurring Invoice Schedules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contract.recurringInvoiceSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-zinc-200">
                    {schedule.name}
                  </span>
                  {schedule.isActive ? (
                    <span className="text-emerald-400">Active</span>
                  ) : (
                    <span className="text-zinc-500">Inactive</span>
                  )}
                </div>
                <p className="text-zinc-400">
                  {contract.currency} {schedule.amount.toLocaleString()} / {schedule.frequency}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}