// lib/logic/lead-status-transitions.ts
import { LeadStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.DISQUALIFIED],
  [LeadStatus.CONTACTED]: [
    LeadStatus.QUALIFIED,
    LeadStatus.PROPOSAL,
    LeadStatus.DISQUALIFIED,
  ],
  [LeadStatus.QUALIFIED]: [
    LeadStatus.PROPOSAL,
    LeadStatus.CONVERTED,
    LeadStatus.DISQUALIFIED,
  ],
  [LeadStatus.PROPOSAL]: [LeadStatus.CONVERTED, LeadStatus.DISQUALIFIED],
  [LeadStatus.DISQUALIFIED]: [LeadStatus.NEW, LeadStatus.CONTACTED], // Re-opening a lead
  [LeadStatus.CONVERTED]: [], // Terminal state: converted leads usually cannot change status
};

export function canTransitionLeadStatus(
  currentStatus: LeadStatus,
  targetStatus: LeadStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}