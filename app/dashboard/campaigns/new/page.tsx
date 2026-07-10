"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, FileText } from "lucide-react";

type Client = { id: string; clientName: string };

const DEFAULT_AGENCY_ID = "cmqv7pkzo0000xmkk0u7229sf";

const getStoredAgencyId = () => {
  if (typeof window === "undefined") return "";
  try {
    const storedUser =
      window.sessionStorage.getItem("agency_user") ||
      window.localStorage.getItem("agency_user") ||
      window.sessionStorage.getItem("user") ||
      window.localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser)?.agencyId ?? "" : "";
  } catch {
    return "";
  }
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [agencyId, setAgencyId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // form state
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [cloudLink, setCloudLink] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusSelect, setStatusSelect] = useState("PLANNED");

  

  useEffect(() => {
    const queryAgencyId =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("agencyId") ?? "";
    const stored = getStoredAgencyId();
    const resolved = queryAgencyId || (session?.user as any)?.agencyId || stored || DEFAULT_AGENCY_ID;
    setAgencyId(resolved);
  }, [session]);

  useEffect(() => {
    if (!agencyId) return;
    fetchClients(agencyId);
  }, [agencyId]);

  const fetchClients = async (activeAgencyId: string) => {
    setLoadingClients(true);
    try {
      const res = await fetch(`/api/clients?agencyId=${encodeURIComponent(activeAgencyId)}`, {
        cache: "no-store",
        headers: { "x-agency-id": activeAgencyId },
      });
      const dataText = await res.text();
      const data = dataText ? JSON.parse(dataText) : null;
      if (!res.ok) throw new Error(data?.error || "Failed to load clients");
      const list = Array.isArray(data) ? data : data.clients ?? [];
      setClients(list);
    } catch (err: any) {
      console.error("Failed to fetch clients", err);
      setClients([]);
      setError(err?.message ?? "Failed to load clients");
    } finally {
      setLoadingClients(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agencyId) {
      setError("Missing agency context.");
      return;
    }
    if (!name || !clientId) {
      setError("Campaign name and client are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        clientId,
        agencyId,
        objective,
        cloudLink: cloudLink || undefined,
        budget: budget ? Number(budget) : 0,
        currency,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusSelect || "PLANNED",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agency-id": agencyId },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || `Failed to create campaign (${res.status})`);
      }

      // success -> go to campaigns list
      router.push("/dashboard/campaigns");
    } catch (err: any) {
      console.error("Create campaign error:", err);
      setError(err?.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center font-black uppercase italic animate-pulse">Preparing Campaign Studio...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      <header>
        <h1 className="text-4xl font-black uppercase italic underline decoration-blue-600 decoration-4">New Campaign</h1>
        <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-2">Campaign setup, budget & schedule</p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <FileText className="h-4 w-4" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Identity Sidebar */}
        <aside className="lg:col-span-4">
          <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm sticky top-8">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
              Identity & Client
            </label>

            <div className="mt-4 space-y-4">
              <select
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-bold border-2 border-transparent focus:border-blue-600 transition-all"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">SELECT CLIENT</option>
                {loadingClients ? (
                  <option>Loading clients…</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                    </option>
                  ))
                )}
              </select>

              <input
                placeholder="Campaign name"
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <textarea
                placeholder="Campaign objective / brief"
                rows={4}
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all resize-none"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />

              <input
                placeholder="Cloud assets link (optional)"
                className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all"
                value={cloudLink}
                onChange={(e) => setCloudLink(e.target.value)}
              />
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-4 tracking-widest">Setup</p>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    // toggle quick statuses for convenience
                    setStatusSelect((s) => (s === "PLANNED" ? "ACTIVE" : "PLANNED"));
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    statusSelect === "ACTIVE"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusSelect}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full mt-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3
                ${isSubmitting ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-foreground text-background hover:bg-blue-600 hover:text-white"}
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create campaign"
              )}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Budget</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="flex-1 p-4 rounded-xl bg-muted/10 border border-border text-sm outline-none"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl p-4 bg-muted/10 border border-border">
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Timeline</label>
                <div className="flex gap-2">
                  <input type="date" className="flex-1 p-4 rounded-xl bg-muted/10 border border-border" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <input type="date" className="flex-1 p-4 rounded-xl bg-muted/10 border border-border" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Notes</label>
              <textarea className="w-full mt-3 p-4 rounded-xl bg-muted/20 border border-border min-h-[140px] resize-none" placeholder="Add any additional notes for the campaign..." value={objective} onChange={(e) => setObjective(e.target.value)} />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.push("/dashboard/campaigns")} className="h-10 rounded-md px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Campaign
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}