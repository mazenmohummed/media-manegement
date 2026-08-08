"use client";

import { useState } from "react";
import { LeadStatus } from "@prisma/client";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadStatusSelect } from "@/components/leads/lead-status-select";
import { ConvertLeadModal } from "@/components/leads/convert-lead-modal";
import { ArrowRightLeft } from "lucide-react";

interface LeadHeaderActionsProps {
  lead: {
    id: string;
    status: LeadStatus;
    companyName?: string | null;
    contactName?: string | null;
    estimatedBudget?: number | null;
    currency?: string | null;
    expectedCloseDate?: Date | string | null;
    opportunity?: { id: string } | null;
  };
}

export function LeadHeaderActions({ lead }: LeadHeaderActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <LeadStatusBadge status={lead.status} />
        <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
        
        {lead.status !== LeadStatus.CONVERTED && !lead.opportunity && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-600/30 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Convert Lead
          </button>
        )}
      </div>

      <ConvertLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lead={lead}
      />
    </>
  );
}