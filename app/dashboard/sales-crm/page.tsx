import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { 
  Users, 
  Target, 
  FileText, 
  FileCheck, 
  Repeat, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight,
  Plus,
  Briefcase
} from "lucide-react";

async function getSalesCrmDashboardData() {
  const [
    rawLeads, 
    rawOpportunities, 
    rawProposals, 
    rawContracts, 
    rawRecurring, 
    leadCount, 
    oppCount, 
    proposalCount, 
    contractCount
  ] = await Promise.all([
    // Fetch Recent Leads
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contactName: true,
        companyName: true,
        contactEmail: true,
        status: true,
        source: true,
        createdAt: true,
      }
    }),

    // Fetch Recent Opportunities
    prisma.opportunity.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        budget: true,
        currency: true,
        stage: true,
        expectedCloseDate: true,
      }
    }),

    // Fetch Recent Proposals
    prisma.proposal.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        proposalNo: true,
        totalAmount: true,
        currency: true,
        status: true,
        validUntil: true,
      }
    }),

    // Fetch Active Contracts
    prisma.contract.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNo: true,
        name: true,
        monthlyValue: true,
        currency: true,
        status: true,
        endDate: true,
      }
    }),

    // Fetch Recurring Schedules
    prisma.recurringInvoiceSchedule.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        amount: true,
        currency: true,
        frequency: true,
        nextRunDate: true,
      }
    }),

    // Counts
    prisma.lead.count(),
    prisma.opportunity.count(),
    prisma.proposal.count(),
    prisma.contract.count(),
  ]);

  const allOpportunities = await prisma.opportunity.findMany({ select: { budget: true } });
  const totalPipelineValue = allOpportunities.reduce((acc, curr) => acc + (curr.budget || 0), 0);

  const allContracts = await prisma.contract.findMany({ select: { monthlyValue: true } });
  const totalContractValue = allContracts.reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);

  return {
    leads: rawLeads,
    opportunities: rawOpportunities,
    proposals: rawProposals,
    contracts: rawContracts,
    recurringSchedules: rawRecurring,
    stats: {
      leadCount,
      oppCount,
      proposalCount,
      contractCount,
      totalPipelineValue,
      totalContractValue,
    }
  };
}

export default async function SalesCrmDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-6 text-red-700 dark:text-red-300 font-medium border border-red-200 dark:border-red-900 shadow-sm">
        Unauthorized access. Please log in to view the Sales & CRM dashboard.
      </div>
    );
  }

  const { leads, opportunities, proposals, contracts, recurringSchedules, stats } = await getSalesCrmDashboardData();

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto transition-colors duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
              Sales & CRM
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Overview & Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Commercial Performance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Monitor incoming leads, active sales pipelines, generated proposals, signed contracts, and recurring revenue schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard/opportunities/new"
            className="inline-flex items-center gap-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Deal / Opportunity
          </a>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Leads</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.leadCount}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Active inquiries
            </p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pipeline Value</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              ${stats.totalPipelineValue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.oppCount} open opportunities</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Proposals</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.proposalCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Out for client review</p>
          </div>
          <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Contracts Value</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              ${stats.totalContractValue.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{stats.contractCount} signed agreements</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Opportunities & Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Opportunities Pipeline (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Opportunities Pipeline</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Deals currently progressing through your sales funnel stages.</p>
            </div>
            <a href="/dashboard/opportunities" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr className="text-slate-400 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="px-6 py-3">Deal Name</th>
                  <th className="px-6 py-3">Stage</th>
                  <th className="px-6 py-3">Expected Close</th>
                  <th className="px-6 py-3 text-right">Budget / Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No active opportunities found.</td>
                  </tr>
                ) : (
                  opportunities.map((opp: any) => (
                    <tr key={opp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        {opp.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                          {opp.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        {opp.currency} {(opp.budget || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Leads (Spans 1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Leads</h2>
            <a href="/dashboard/leads" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
          
          <div className="p-6 space-y-4">
            {leads.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-6">No leads captured yet.</p>
            ) : (
              leads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{lead.contactName || "Unnamed Lead"}</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{lead.companyName || lead.contactEmail}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-slate-700">
                    {lead.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Proposals, Contracts, and Sales CRM link */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Proposals Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Proposals
            </h3>
            <a href="/dashboard/proposals" className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View All</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {proposals.length === 0 ? (
              <p className="p-5 text-slate-400 dark:text-slate-500 text-center">No proposals found.</p>
            ) : (
              proposals.map((prop: any) => (
                <div key={prop.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Proposal #{prop.proposalNo || prop.id.slice(-6)}</p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Valid until: {prop.validUntil ? new Date(prop.validUntil).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">{prop.currency} {prop.totalAmount.toLocaleString()}</p>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-900 px-2 py-0.5 rounded-full font-medium">{prop.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contracts Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Contracts
            </h3>
            <a href="/dashboard/contracts" className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View All</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {contracts.length === 0 ? (
              <p className="p-5 text-slate-400 dark:text-slate-500 text-center">No contracts found.</p>
            ) : (
              contracts.map((contract: any) => (
                <div key={contract.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{contract.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{contract.contractNo || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{contract.currency} {(contract.monthlyValue || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-900 px-2 py-0.5 rounded-full font-medium">{contract.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recurring Schedules Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Recurring Schedules
            </h3>
            <a href="/dashboard/sales-crm" className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View CRM Hub</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {recurringSchedules.length === 0 ? (
              <p className="p-5 text-slate-400 dark:text-slate-500 text-center">No active schedules found.</p>
            ) : (
              recurringSchedules.map((rec: any) => (
                <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{rec.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Next Run: {rec.nextRunDate ? new Date(rec.nextRunDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">{rec.currency} {rec.amount.toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${rec.isActive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/50 dark:border-emerald-900' : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      {rec.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}