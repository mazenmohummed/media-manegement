// components/tasks/ClientCard.tsx
"use client";

import { Building2 } from "lucide-react";

interface Client {
  id: string;
  clientName: string;
  email: string | null;
  phoneNumber: string | null;
  accountType: string | null;
}

interface ClientCardProps {
  client: Client | null;
}

export function ClientCard({ client }: ClientCardProps) {
  if (!client) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-purple-400" /> Client
      </h3>
      <div className="space-y-1">
        <p className="text-sm text-zinc-200 font-medium">{client.clientName}</p>
        {client.accountType && (
          <p className="text-[11px] text-zinc-500">{client.accountType}</p>
        )}
        {client.email && <p className="text-xs text-zinc-400">{client.email}</p>}
        {client.phoneNumber && <p className="text-xs text-zinc-400">{client.phoneNumber}</p>}
      </div>
    </div>
  );
}