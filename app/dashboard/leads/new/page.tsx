// app/dashboard/leads/new/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LeadSource, LeadStatus } from "@prisma/client";
import {
  ArrowLeft,
  Building2,
  UserCheck,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Briefcase,
} from "lucide-react";

// Predefined industry options relevant to agency clients
const INDUSTRY_OPTIONS = [
  "E-commerce",
  "Real Estate",
  "Healthcare & Wellness",
  "Technology & SaaS",
  "Finance & Banking",
  "Education",
  "Hospitality & Tourism",
  "Automotive",
  "Retail & Consumer Goods",
  "Media & Entertainment",
  "Manufacturing",
  "Professional Services",
  "Other",
];

async function createLeadAction(formData: FormData) {
  "use server";

  const headerList = await headers();
  const agencyId = headerList.get("x-agency-id");

  if (!agencyId) {
    throw new Error("Unauthorized: Missing agency context.");
  }

  const companyName = formData.get("companyName") as string;
  const contactName = formData.get("contactName") as string | null;
  const contactEmail = formData.get("contactEmail") as string | null;
  const contactPhone = formData.get("contactPhone") as string | null;
  const industry = formData.get("industry") as string | null;
  const currency = (formData.get("currency") as string) || "EGP";
  const budgetRaw = formData.get("estimatedBudget") as string | null;
  const closeDateRaw = formData.get("expectedCloseDate") as string | null;
  const source = (formData.get("source") as LeadSource) || LeadSource.OTHER;
  const status = (formData.get("status") as LeadStatus) || LeadStatus.NEW;
  const ownerId = formData.get("ownerId") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!companyName || companyName.trim() === "") {
    throw new Error("Company name is required.");
  }

  const estimatedBudget = budgetRaw ? parseFloat(budgetRaw) : null;
  const expectedCloseDate = closeDateRaw ? new Date(closeDateRaw) : null;

  // Auto-generate lead serial number (e.g. LEAD-1001)
  const leadCount = await db.lead.count({ where: { agencyId } });
  const leadNo = `LEAD-${1000 + leadCount + 1}`;

  const newLead = await db.lead.create({
    data: {
      leadNo,
      companyName,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      industry: industry && industry !== "" ? industry : null,
      estimatedBudget: estimatedBudget && !isNaN(estimatedBudget) ? estimatedBudget : null,
      currency,
      expectedCloseDate,
      source,
      status,
      notes: notes || null,
      agencyId,
      ownerId: ownerId && ownerId !== "UNASSIGNED" ? ownerId : null,
    },
  });

  redirect(`/dashboard/leads/${newLead.id}`);
}

export default async function NewLeadPage() {
  const headerList = await headers();
  const agencyId = headerList.get("x-agency-id");

  if (!agencyId) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Unauthorized: Missing agency context.
      </div>
    );
  }

  // Fetch potential owners/account managers within the agency
  const users = await db.user.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-zinc-100">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Lead</h1>
            <p className="text-sm text-zinc-400">
              Create a new prospect entry in your pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form action={createLeadAction} className="space-y-6">
        {/* Section 1: Lead Information */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-400" />
            Company & Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Company Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                required
                placeholder="Acme Corp"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* Contact Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Contact Name</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  name="contactName"
                  placeholder="John Doe"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Industry (Dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Industry</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                <select
                  name="industry"
                  defaultValue=""
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none appearance-none"
                >
                  <option value="" disabled hidden>
                    Select an industry...
                  </option>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="john@acme.com"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="tel"
                  name="contactPhone"
                  placeholder="+20 100 000 0000"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Financials & Pipeline Settings */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-400" />
            Pipeline & Deal Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Lead Status</label>
              <select
                name="status"
                defaultValue={LeadStatus.NEW}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              >
                {Object.values(LeadStatus).map((st) => (
                  <option key={st} value={st}>
                    {st.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Lead Source</label>
              <select
                name="source"
                defaultValue={LeadSource.OTHER}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              >
                {Object.values(LeadSource).map((src) => (
                  <option key={src} value={src}>
                    {src.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Estimated Budget</label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-700 bg-zinc-900 text-xs text-zinc-400">
                  <DollarSign className="h-3.5 w-3.5" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="estimatedBudget"
                  placeholder="50000"
                  className="w-full rounded-r-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Currency</label>
              <select
                name="currency"
                defaultValue="EGP"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              >
                <option value="EGP">EGP - Egyptian Pound</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="AED">AED - UAE Dirham</option>
              </select>
            </div>

            {/* Expected Close Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Expected Close Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  name="expectedCloseDate"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Lead Owner */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Assigned Owner</label>
              <select
                name="ownerId"
                defaultValue="UNASSIGNED"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              >
                <option value="UNASSIGNED">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Notes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            Additional Notes
          </h2>

          <div className="space-y-1.5">
            <textarea
              name="notes"
              rows={4}
              placeholder="Add initial notes, discovery points, or key requirements..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/leads"
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );
}