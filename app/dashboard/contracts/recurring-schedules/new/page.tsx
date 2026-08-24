import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, Plus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecurringInvoiceFrequency } from "@prisma/client";

const FREQUENCIES = Object.values(RecurringInvoiceFrequency);

interface PageProps {
  params: Promise<{ contractId: string }>;
}

export default async function NewRecurringSchedulePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { contractId } = await params;

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    select: { id: true, name: true, contractNo: true, agencyId: true, monthlyValue: true, currency: true, clientId: true }, // Added clientId here
  });

  if (!contract || contract.agencyId !== agencyId) {
    return notFound();
  }

  async function createRecurringSchedule(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) throw new Error("Unauthorized");

    const agencyId = session.user.agencyId;
    
    // Ensure contract is valid inside the action scope
    if (!contract) {
      throw new Error("Contract not found");
    }

    const name = formData.get("name") as string;
    const amount = formData.get("amount") as string;
    const currency = (formData.get("currency") as string) || "EGP";
    const frequency = formData.get("frequency") as RecurringInvoiceFrequency;
    const startDate = formData.get("startDate") as string;
    const isActive = formData.get("isActive") === "on";

    if (!name || !amount || !frequency || !startDate) {
      throw new Error("Missing required fields");
    }

    await db.recurringInvoiceSchedule.create({
      data: {
        agencyId,
        contractId,
        clientId: contract.clientId, // Safe now because of the guard check above
        name,
        amount: parseFloat(amount),
        currency,
        frequency,
        nextRunDate: new Date(startDate),
        isActive,
      },
    });

    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/contracts/${contractId}`);
  }
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href={`/dashboard/contracts/${contractId}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contract ({contract.contractNo})
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Add Recurring Schedule</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure automated billing cycles or repeating milestones for: <span className="text-zinc-200 font-medium">{contract.name}</span></p>
      </div>

      <form action={createRecurringSchedule} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Repeat className="w-4 h-4 text-purple-400" />
          Schedule Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Schedule Name *</label>
            <Input name="name" required placeholder="e.g. Monthly Retainer Invoice" defaultValue={contract.name} className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Frequency *</label>
            <select name="frequency" required className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Amount *</label>
            <Input name="amount" type="number" step="0.01" min="0" required defaultValue={contract.monthlyValue || ""} placeholder="0.00" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Currency</label>
            <select name="currency" defaultValue={contract.currency || "EGP"} className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Start Date *</label>
            <Input name="startDate" type="date" required className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">End Date (Optional)</label>
            <Input name="endDate" type="date" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input type="checkbox" id="isActive" name="isActive" defaultChecked className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-purple-500" />
          <label htmlFor="isActive" className="text-sm font-medium text-zinc-300">Set schedule as active immediately</label>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <Link href={`/dashboard/contracts/${contractId}`}>
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</Button>
          </Link>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
            <Plus className="w-4 h-4" /> Save Schedule
          </Button>
        </div>
      </form>
    </div>
  );
}