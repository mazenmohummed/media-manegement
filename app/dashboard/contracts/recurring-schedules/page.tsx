import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { Repeat, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function RecurringSchedulesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;

  // Fetch all recurring schedules for the agency along with contract and client info
  const schedules = await db.recurringInvoiceSchedule.findMany({
    where: { agencyId },
    include: {
      contract: {
        select: {
          id: true,
          contractNo: true,
          name: true,
          client: {
            select: {
              id: true,
              clientName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Repeat className="w-8 h-8 text-purple-500" />
            Recurring Invoice Schedules
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage automated recurring billing cycles linked to agency contracts.
          </p>
        </div>

        <Link href="/dashboard/contracts">
          <Button className="bg-purple-600 hover:bg-purple-500 text-zinc-100 gap-2">
            Add Schedule (Select Contract)
          </Button>
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">All Schedules ({schedules.length})</h2>
        </div>

        {schedules.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto text-zinc-400">
              <Repeat className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No recurring schedules found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Go to a specific contract details page to set up a new automated recurring billing cycle.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400 bg-zinc-950/30">
                  <th className="p-4">Schedule Name</th>
                  <th className="p-4">Contract / Client</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-medium text-zinc-200">
                      {schedule.name}
                    </td>
                    <td className="p-4">
                      {schedule.contract ? (
                        <Link 
                          href={`/dashboard/contracts/${schedule.contract.id}`}
                          className="hover:text-purple-400 transition-colors flex flex-col"
                        >
                          <span className="text-zinc-200 font-medium flex items-center gap-1">
                            {schedule.contract.name}
                            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                          </span>
                          <span className="text-xs text-zinc-500">
                            {schedule.contract.client?.clientName || "No Client"} ({schedule.contract.contractNo})
                          </span>
                        </Link>
                      ) : (
                        <span className="text-zinc-500 italic">Unlinked</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-semibold uppercase tracking-wider">
                        {schedule.frequency}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-zinc-200">
                      {schedule.amount.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">{schedule.currency}</span>
                    </td>
                    <td className="p-4">
                      {schedule.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-zinc-400">
                      {new Date(schedule.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {schedule.contractId && (
                        <Link href={`/dashboard/contracts/${schedule.contractId}`}>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 h-8 px-2">
                            View Contract
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}