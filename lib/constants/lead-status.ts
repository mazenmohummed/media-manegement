// lib/constants/lead-status.ts
import { LeadStatus } from "@prisma/client";

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; variant: string; colorClass: string; description: string }
> = {
  [LeadStatus.NEW]: {
    label: "New",
    variant: "blue",
    colorClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "Newly captured lead, no contact made yet.",
  },
  [LeadStatus.CONTACTED]: {
    label: "Contacted",
    variant: "amber",
    colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Initial reach-out completed.",
  },
  [LeadStatus.QUALIFIED]: {
    label: "Qualified",
    variant: "emerald",
    colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description: "Lead fits ICP and has high intent.",
  },
  [LeadStatus.PROPOSAL]: {
    label: "Proposal",
    variant: "indigo",
    colorClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    description: "Proposal or quote sent to lead.",
  },
  [LeadStatus.DISQUALIFIED]: {
    label: "Disqualified",
    variant: "zinc",
    colorClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    description: "Lead is not a good fit or went cold.",
  },
  [LeadStatus.CONVERTED]: {
    label: "Converted",
    variant: "purple",
    colorClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Successfully converted into an Opportunity/Account.",
  },
};