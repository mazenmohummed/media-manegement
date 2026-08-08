"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LeadSource } from "@prisma/client";

interface Owner {
  id: string;
  name: string | null;
  email: string;
}

interface LeadFiltersProps {
  owners: Owner[];
  currentOwnerId?: string;
  currentSource?: string;
}

export function LeadFilters({
  owners,
  currentOwnerId,
  currentSource,
}: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL") {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Owner Filter */}
      <select
        value={currentOwnerId || "ALL"}
        onChange={(e) => handleFilterChange("ownerId", e.target.value)}
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-zinc-500 cursor-pointer"
      >
        <option value="ALL">All Owners</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name || owner.email}
          </option>
        ))}
      </select>

      {/* Source Filter */}
      <select
        value={currentSource || "ALL"}
        onChange={(e) => handleFilterChange("source", e.target.value)}
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-zinc-500 cursor-pointer"
      >
        <option value="ALL">All Sources</option>
        {Object.values(LeadSource).map((src) => (
          <option key={src} value={src}>
            {src.replace("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}