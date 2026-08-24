import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractStatus, UserRole } from "@prisma/client";

const ELIGIBLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.TEAMLEADER,
  UserRole.CREATIVE,
];

interface PageProps {
  params: Promise<{ contractId: string }>;
}

export default async function EditContractPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { contractId } = await params;
  const agencyId = session.user.agencyId;

  const [contract, clients, eligibleUsers] = await Promise.all([
    db.contract.findUnique({
      where: { id: contractId },
    }),
    db.client.findMany({
      where: { agencyId },
      select: { id: true, clientName: true, clientNo: true },
      orderBy: { clientName: "asc" },
    }),
    db.user.findMany({
      where: {
        agencyId,
        isActive: true,
        role: { in: ELIGIBLE_ROLES },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contract || contract.agencyId !== agencyId) {
    return notFound();
  }

  async function updateContract(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) throw new Error("Unauthorized");

    const agencyId = session.user.agencyId;
    const name = formData.get("name") as string;
    const clientId = formData.get("clientId") as string;
    const userId = formData.get("userId") as string;
    const status = formData.get("status") as ContractStatus;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const monthlyValue = formData.get("monthlyValue") as string;
    const currency = formData.get("currency") as string;
    const termsUrl = formData.get("termsUrl") as string;

    if (!name || !clientId) throw new Error("Contract name and client are required");

    if (userId) {
      const userCheck = await db.user.findFirst({
        where: { id: userId, agencyId, role: { in: ELIGIBLE_ROLES } },
      });
      if (!userCheck) throw new Error("Invalid assigned employee selected");
    }

    await db.contract.update({
      where: { id: contractId },
      data: {
        name,
        clientId,
        userId: userId || null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        monthlyValue: monthlyValue ? parseFloat(monthlyValue) : null,
        currency,
        termsUrl: termsUrl || null,
      },
    });

    redirect(`/dashboard/contracts/${contractId}`);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href={`/dashboard/contracts/${contractId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Contract
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Edit Contract</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Update agreement details, values, or assignments for {contract.contractNo}.
        </p>
      </div>

      <form action={updateContract} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <FileText className="w-4 h-4 text-purple-400" />
          Contract Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Contract Name *</label>
            <Input
              name="name"
              defaultValue={contract.name}
              required
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Client *</label>
            <select
              name="clientId"
              defaultValue={contract.clientId}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}{c.clientNo ? ` (${c.clientNo})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Account Manager / Assignee</label>
            <select
              name="userId"
              defaultValue={contract.userId || ""}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="">Unassigned</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Status</label>
            <select
              name="status"
              defaultValue={contract.status}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              {Object.values(ContractStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Start Date</label>
            <Input
              name="startDate"
              type="date"
              defaultValue={contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : ""}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">End Date</label>
            <Input
              name="endDate"
              type="date"
              defaultValue={contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : ""}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Monthly Value</label>
            <Input
              name="monthlyValue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={contract.monthlyValue ?? ""}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Currency</label>
            <select
              name="currency"
              defaultValue={contract.currency}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Terms Document URL</label>
          <Input
            name="termsUrl"
            type="url"
            defaultValue={contract.termsUrl || ""}
            placeholder="https://..."
            className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
          />
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <Link href={`/dashboard/contracts/${contractId}`}>
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}