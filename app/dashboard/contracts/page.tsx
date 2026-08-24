import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  Plus,
  Building,
  DollarSign,
  Calendar,
  UserCog,
  FileText,
  ArrowUpRight,
  Search,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractStatus } from "@prisma/client";

interface SearchParams {
  status?: ContractStatus;
  search?: string;
  clientId?: string;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { status, search, clientId } = await searchParams;

  const whereClause: any = { agencyId };
  if (status) whereClause.status = status;
  if (clientId) whereClause.clientId = clientId;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contractNo: { contains: search, mode: "insensitive" } },
      { client: { clientName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const contracts = await db.contract.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, clientName: true, email: true } },
      user: { select: { id: true, name: true, role: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const clients = await db.client.findMany({
    where: { agencyId },
    select: { id: true, clientName: true },
    orderBy: { clientName: "asc" },
  });

  const statusColors: Record<ContractStatus, string> = {
    DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700",
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    EXPIRED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage signed agreements, track active engagements, and monitor
            contract value.
          </p>
        </div>
        <Link href="/dashboard/contracts/new">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Contract
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search contracts, clients, or numbers..."
              className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              name="status"
              defaultValue={status || ""}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Statuses</option>
              {Object.values(ContractStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-zinc-500" />
            <select
              name="clientId"
              defaultValue={clientId || ""}
              className="bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Filter
          </Button>

          {(status || search || clientId) && (
            <Link href="/dashboard/contracts">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Clear
              </Button>
            </Link>
          )}
        </form>
      </div>

      {/* Contracts Grid */}
      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/dashboard/contracts/${contract.id}`}
              className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all space-y-4 block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                    {contract.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {contract.contractNo || contract.id.slice(0, 8)}
                  </p>
                </div>
                <Badge className={`${statusColors[contract.status]} shrink-0`}>
                  {contract.status}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">
                    {contract.client?.clientName || "No client"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    {contract.currency}{" "}
                    {contract.monthlyValue?.toLocaleString() ?? "0"}
                    <span className="text-zinc-500"> /mo</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {contract.startDate
                      ? new Date(contract.startDate).toLocaleDateString()
                      : "Not started"}{" "}
                    →{" "}
                    {contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString()
                      : "Ongoing"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-300">
                  <UserCog className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>{contract.user?.name || "Unassigned"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{contract._count.projects} project(s)</span>
                </div>
                <span className="text-purple-400 flex items-center gap-1 group-hover:underline">
                  View <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-200 font-medium">No contracts found</h3>
          <p className="text-sm text-zinc-500 mt-1">
            {status || search || clientId
              ? "Try adjusting your filters."
              : "Accepted proposals will automatically generate contracts here."}
          </p>
        </div>
      )}
    </div>
  );
}