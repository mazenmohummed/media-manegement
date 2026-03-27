"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, CreditCard, ShieldAlert } from "lucide-react";

export default function AgencyRegistryTable({ agencies }: { agencies: any[] }) {
  const router = useRouter();

  return (
    <div className="w-full bg-card/50 border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Agency Entity</th>
            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Tier</th>
            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Status</th>
            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-right">Operations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {agencies.map((agency) => {
            // Fallback logic if subscription is missing
            const plan = agency.subscription?.plan || "FREE / TRIAL";
            const status = agency.subscription?.status || "INACTIVE";

            return (
              <tr key={agency.id} className="group transition-colors">
                
                {/* Agency Entity - Clickable */}
                <td 
                  onClick={() => router.push(`/superadmin/agency/${agency.id}`)}
                  className="px-8 py-6 cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-black uppercase italic tracking-tighter text-sm group-hover:text-blue-600 transition-colors">
                      {agency.agencyName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold tracking-tight">
                      {agency.email}
                    </span>
                  </div>
                </td>
                
                {/* Tier - With Fallback */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-blue-600" />
                    <span className="text-[11px] font-black tracking-widest uppercase text-foreground/80">
                      {plan}
                    </span>
                  </div>
                </td>

                {/* Status - With Fallback Styling */}
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
                    status === 'ACTIVE' 
                      ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' 
                      : status === 'TRIALING'
                      ? 'bg-blue-500/5 text-blue-500 border-blue-500/20'
                      : 'bg-rose-500/5 text-rose-500 border-rose-500/20'
                  }`}>
                    {status}
                  </span>
                </td>

                {/* Operations */}
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => router.push(`/superadmin/agency/${agency.id}`)}
                    className="p-2.5 bg-muted/50 hover:bg-blue-600 text-muted-foreground hover:text-white rounded-xl transition-all inline-flex items-center justify-center"
                  >
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}