import { LeadStatus } from "@prisma/client";
import { LEAD_STATUS_CONFIG } from "@/lib/constants/lead-status";

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = LEAD_STATUS_CONFIG[status] || LEAD_STATUS_CONFIG.NEW;

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${config.colorClass}`}
    >
      {config.label}
    </span>
  );
}