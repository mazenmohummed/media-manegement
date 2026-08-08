// app/(client-portal)/portal/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { 
  FolderKanban, 
  Receipt, 
  Clock, 
  ExternalLink,
  DollarSign
} from "lucide-react";

async function getClientPortalData(clientId: string) {
  const [client, rawProjects, rawInvoices, deliverables] = await Promise.all([
    // Fetch Client Details & Budget Overview
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        clientName: true,
        outstandingBalance: true,
        creditLimit: true,
        isOnCreditHold: true,
      },
    }),

    // Fetch Active Projects & Milestones
    prisma.project.findMany({
      where: {
        clientId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectNo: true,
        projectName: true,
        status: true,
        targetDeadline: true,
        cloudLink: true,
        milestones: {
          select: {
            id: true,
            name: true,
            status: true,
            approvalStage: true,
            deadline: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Fetch Recent Invoices
    prisma.clientInvoice.findMany({
      where: { clientId },
      select: {
        id: true,
        invoiceNo: true,
        totalAmount: true,
        balanceDue: true,
        status: true,
        currency: true,
        dueDate: true,
        issuedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Fetch Deliverables / Creative Asset Versions under Client Review
    prisma.creativeAssetVersion.findMany({
      where: {
        status: "CLIENT_REVIEW",
        creativeAsset: {
          concept: {
            project: {
              clientId,
            },
          },
        },
      },
      select: {
        id: true,
        versionNo: true,
        fileUrl: true,
        createdAt: true,
        creativeAsset: {
          select: {
            name: true,
            type: true,
            concept: {
              select: {
                project: {
                  select: { 
                    projectName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Safely map projects to handle field naming flexibility
  const projects = rawProjects.map((p: any) => ({
    ...p,
    displayName: p.projectName || p.name || p.projectNo || "Untitled Project",
  }));

  // Safely map invoices to ensure Decimal values serialize properly
  const invoices = rawInvoices.map((inv: any) => ({
    ...inv,
    totalAmount: Number(inv.totalAmount ?? 0),
    balanceDue: Number(inv.balanceDue ?? 0),
  }));

  // Safely cast client outstanding balance
  const clientData = client ? {
    ...client,
    outstandingBalance: Number(client.outstandingBalance ?? 0),
  } : null;

  return { client: clientData, projects, invoices, deliverables };
}

export default async function ClientPortalPage() {
  const session = await getServerSession(authOptions);

  const clientId = session?.user?.clientId as string | undefined;

  if (!clientId) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-700 font-medium">
        Unauthorized access. No client profile linked to this user account.
      </div>
    );
  }

  const { client, projects, invoices, deliverables } = await getClientPortalData(clientId);

  const activeProjectsCount = projects.filter((p: any) => p.status === "ACTIVE").length;
  const pendingInvoicesCount = invoices.filter(
    (i: any) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID"
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {client?.clientName || "Valued Client"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your ongoing projects, review asset deliverables, and manage invoices.
          </p>
        </div>
        {client?.isOnCreditHold && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
            Account Credit Hold: Please clear outstanding balances.
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Projects
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activeProjectsCount}</p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Invoices
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{pendingInvoicesCount}</p>
          </div>
          <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Outstanding Balance
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ${client?.outstandingBalance ? client.outstandingBalance.toLocaleString() : "0.00"}
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Deliverables Pending Approval */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Deliverables Awaiting Your Review
          </h2>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
            {deliverables.length} Action Required
          </span>
        </div>

        {deliverables.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No assets currently waiting for review.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deliverables.map((item: any) => (
              <div key={item.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-medium text-slate-800 text-sm">
                    {item.creativeAsset.name} (v{item.versionNo})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Project: {item.creativeAsset.concept.project.projectName || item.creativeAsset.concept.project.name} &bull; Type: {item.creativeAsset.type}
                  </p>
                </div>
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition"
                  >
                    Review Asset
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Projects Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Project Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project: any) => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{project.projectNo}</span>
                    <h3 className="font-semibold text-slate-900 text-base">{project.displayName}</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {/* Project Milestones */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase">Milestones</p>
                  {project.milestones.length === 0 ? (
                    <p className="text-xs text-slate-400">No milestones tracked.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {project.milestones.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                          <span className="text-slate-700 font-medium">{m.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'COMPLETED' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : m.status === 'IN_PROGRESS' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {project.cloudLink && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <a
                    href={project.cloudLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Access Cloud Files
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent Invoices Table */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Issued Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Balance Due</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.invoiceNo}</td>
                    <td className="px-6 py-4">{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 font-semibold">{inv.currency} {inv.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{inv.currency} {inv.balanceDue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        inv.status === 'PAID' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : inv.status === 'OVERDUE' 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}