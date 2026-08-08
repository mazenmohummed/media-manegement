import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
} from "lucide-react";
import { KanbanBoard } from "./kanban-board";
import { LeadFilters } from "./lead-filters";

interface SearchParams {
  search?: string;
  status?: string;
  ownerId?: string;
  source?: string;
  view?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, status, ownerId, source, view = "kanban" } = await searchParams;
  const headerList = await headers();
  const agencyId = headerList.get("x-agency-id");

  if (!agencyId) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Unauthorized: Missing agency context.
      </div>
    );
  }

  const whereFilter: any = { agencyId, deletedAt: null };

  if (search) {
    whereFilter.OR = [
      { contactName: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
      { contactPhone: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && status !== "ALL") {
    whereFilter.status = status;
  }

  if (ownerId && ownerId !== "ALL") {
    whereFilter.ownerId = ownerId;
  }

  if (source && source !== "ALL") {
    whereFilter.source = source;
  }

  const [leads, totalLeadsCount, owners] = await Promise.all([
    db.lead.findMany({
      where: whereFilter,
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        interactions: {
          take: 1,
          orderBy: { occurredAt: "desc" },
          select: { type: true, summary: true, occurredAt: true },
        },
        _count: {
          select: { interactions: true },
        },
      },
    }),
    db.lead.count({ where: { agencyId, deletedAt: null } }),
    db.user.findMany({
      where: { agencyId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const activeLeadsCount = leads.length;

  const buildQuery = (paramsToUpdate: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (search) current.set("search", search);
    if (status) current.set("status", status);
    if (ownerId) current.set("ownerId", ownerId);
    if (source) current.set("source", source);
    if (view) current.set("view", view);

    Object.entries(paramsToUpdate).forEach(([k, v]) => {
      if (v === undefined || v === "ALL" || v === "") {
        current.delete(k);
      } else {
        current.set(k, v);
      }
    });

    const queryString = current.toString();
    return queryString ? `?${queryString}` : "";
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6 text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads & Pipeline</h1>
          <p className="text-sm text-zinc-400">
            Manage prospects, communications, and conversion activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <Link
              href={`/dashboard/leads${buildQuery({ view: "kanban" })}`}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === "kanban"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Link>
            <Link
              href={`/dashboard/leads${buildQuery({ view: "table" })}`}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === "table"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </Link>
          </div>

          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>Total Prospects</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold">{totalLeadsCount}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>Filtered View</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold">{activeLeadsCount}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>Total Activity Logged</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {leads.reduce((acc, lead) => acc + lead._count.interactions, 0)}
          </p>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
        <form className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Search name, email, or company..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
        </form>

        {/* Replaced inline form select components with Client Component */}
        <LeadFilters
          owners={owners}
          currentOwnerId={ownerId}
          currentSource={source}
        />
      </div>

      {view === "kanban" ? (
        <KanbanBoard leads={leads as any} />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Lead Contact</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Latest Interaction</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No leads found matching your search.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => {
                    const name =
                      lead.contactName ?? lead.companyName ?? "Unnamed Lead";
                    const email = lead.contactEmail ?? null;
                    const phone = lead.contactPhone ?? null;
                    const lastInteraction = lead.interactions?.[0];

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-zinc-800/40 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium text-zinc-100 hover:underline block"
                          >
                            {name}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                            {email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-zinc-500" />
                                {email}
                              </span>
                            )}
                            {phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-zinc-500" />
                                {phone}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-300">
                          {lead.companyName ? (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                              {lead.companyName}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={String(lead.status)} />
                        </td>

                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {lead.owner ? (
                            lead.owner.name || lead.owner.email
                          ) : (
                            <span className="text-zinc-600">Unassigned</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {lastInteraction ? (
                            <div className="max-w-xs space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                                <MessageSquare className="h-3 w-3 text-zinc-400" />
                                <span>{lastInteraction.type}</span>
                                <span className="text-zinc-500 font-normal">
                                  • {new Date(lastInteraction.occurredAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 truncate">
                                {lastInteraction.summary}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">
                              No activity logged
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CONTACTED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    QUALIFIED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    PROPOSAL: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    CONVERTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    DISQUALIFIED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const badgeStyle =
    styles[status.toUpperCase()] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeStyle}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}