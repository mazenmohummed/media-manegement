"use client";

import { useState } from "react";
import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { Building2, Mail, Phone, DollarSign, Calendar } from "lucide-react";
import { LEAD_STATUS_CONFIG } from "@/lib/constants/lead-status";

interface LeadItem {
  id: string;
  companyName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: LeadStatus;
  estimatedBudget?: number | null;
  currency?: string | null;
  source?: string | null;
  owner?: { id: string; name: string | null; email: string } | null;
}

interface KanbanBoardProps {
  leads: LeadItem[];
}

// Order of columns in the Kanban pipeline
const PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.CONVERTED,
  LeadStatus.DISQUALIFIED,
];

export function KanbanBoard({ leads }: KanbanBoardProps) {
  // Group leads into status columns
  const groupedLeads = PIPELINE_STAGES.reduce<Record<string, LeadItem[]>>(
    (acc, stage) => {
      acc[stage] = leads.filter((lead) => lead.status === stage);
      return acc;
    },
    {}
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = groupedLeads[stage] || [];
        const config = LEAD_STATUS_CONFIG[stage] || { label: stage };
        const stageTotal = stageLeads.reduce(
          (sum, lead) => sum + (lead.estimatedBudget || 0),
          0
        );

        return (
          <div
            key={stage}
            className="flex-shrink-0 w-80 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col max-h-[calc(100vh-220px)]"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs tracking-wider uppercase text-zinc-200">
                  {config.label}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                  {stageLeads.length}
                </span>
              </div>
              {stageTotal > 0 && (
                <span className="text-xs text-emerald-400 font-medium flex items-center">
                  ${stageTotal.toLocaleString()}
                </span>
              )}
            </div>

            {/* Column Body / Cards */}
            <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[150px]">
              {stageLeads.length === 0 ? (
                <div className="h-24 border border-dashed border-zinc-800/80 rounded-lg flex items-center justify-center text-xs text-zinc-600">
                  No leads
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadItem }) {
  return (
    <Link
      href={`/dashboard/leads/${lead.id}`}
      className="block bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all shadow-sm group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-zinc-100 group-hover:text-blue-400 group-hover:underline line-clamp-1">
          {lead.companyName}
        </h4>
      </div>

      {lead.contactName && (
        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
          {lead.contactName}
        </p>
      )}

      {/* Meta Info */}
      <div className="mt-3 space-y-1 text-[11px] text-zinc-400 border-t border-zinc-900 pt-2">
        {lead.contactEmail && (
          <div className="flex items-center gap-1.5 text-zinc-400 truncate">
            <Mail className="h-3 w-3 text-zinc-500 shrink-0" />
            <span className="truncate">{lead.contactEmail}</span>
          </div>
        )}
        {lead.contactPhone && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Phone className="h-3 w-3 text-zinc-500 shrink-0" />
            <span>{lead.contactPhone}</span>
          </div>
        )}
      </div>

      {/* Card Footer: Budget & Owner */}
      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-zinc-900">
        {lead.estimatedBudget ? (
          <span className="text-emerald-400 font-medium flex items-center text-[11px]">
            {lead.currency || "EGP"} {lead.estimatedBudget.toLocaleString()}
          </span>
        ) : (
          <span className="text-zinc-600 text-[11px]">Unpriced</span>
        )}

        {lead.owner && (
          <span
            title={lead.owner.name || lead.owner.email}
            className="h-5 w-5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold uppercase"
          >
            {(lead.owner.name || lead.owner.email).slice(0, 2)}
          </span>
        )}
      </div>
    </Link>
  );
}