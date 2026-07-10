"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  CalendarClock,
  Layers,
  DollarSign,
  TrendingUp,
  FileText,
  Loader2,
} from "lucide-react";

const DEFAULT_AGENCY_ID = "cmqv7pkzo0000xmkk0u7229sf";

type CampaignRow = {
  id: string;
  campaignNo?: string | null;
  name: string;
  objective?: string | null;
  status?: string | null;
  budget?: number;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  client?: { id: string; clientName: string } | null;
  projectsCount?: number;
  createdAt: string;
};

type ClientSelectRow = { id: string; clientName: string };

const currency = (value: number, code = "EGP") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value || 0);

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

export default function CampaignsPage() {
  const [agencyId, setAgencyId] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [clients, setClients] = useState<ClientSelectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedClient, setSelectedClient] = useState("ALL");

  // Form
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "EGP",
    objective: "",
    status: "PLANNED",
  });

  useEffect(() => {
    const queryAgencyId =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("agencyId") ?? "";
    const storedAgencyId = getStoredAgencyId();
    const resolvedAgencyId = queryAgencyId || storedAgencyId || DEFAULT_AGENCY_ID;

    setAgencyId(resolvedAgencyId);
    fetchCampaigns(resolvedAgencyId);
    fetchClientsForSelect(resolvedAgencyId);
  }, []);

  const fetchCampaigns = async (activeAgencyId = agencyId) => {
    if (!activeAgencyId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns?agencyId=${encodeURIComponent(activeAgencyId)}`, {
        cache: "no-store",
        headers: { "x-agency-id": activeAgencyId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load campaigns");
      setCampaigns(Array.isArray(data) ? data : data.campaigns ?? []);
    } catch (err: any) {
      setError(err?.message || "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsForSelect = async (activeAgencyId = agencyId) => {
    if (!activeAgencyId) return;
    setLoadingClients(true);
    try {
      const res = await fetch(`/api/clients?agencyId=${encodeURIComponent(activeAgencyId)}`, {
        cache: "no-store",
        headers: { "x-agency-id": activeAgencyId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load clients");
      const list = Array.isArray(data) ? data : data.clients ?? [];
      setClients(list.map((c: any) => ({ id: c.id, clientName: c.clientName })));
    } catch {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.campaignNo?.toLowerCase().includes(q) ||
        c.client?.clientName?.toLowerCase().includes(q) ||
        (c.objective || "").toLowerCase().includes(q);

      const matchesStatus = selectedStatus === "ALL" || (c.status || "").toUpperCase() === selectedStatus;
      const matchesClient = selectedClient === "ALL" || (c.client?.id || "") === selectedClient;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [campaigns, searchTerm, selectedStatus, selectedClient]);

  const stats = useMemo(() => {
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const active = campaigns.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
    return {
      campaignsCount: campaigns.length,
      totalBudget,
      active,
      avgBudget: campaigns.length ? Math.round(totalBudget / campaigns.length) : 0,
    };
  }, [campaigns]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((cur) => ({ ...cur, [key]: value }));
  };

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agencyId) {
      setError("Missing agency context.");
      return;
    }

    if (!form.name || !form.clientId) {
      setError("Name and client are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        clientId: form.clientId,
        agencyId,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : 0,
        currency: form.currency,
        objective: form.objective,
        status: form.status,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create campaign");
      setShowForm(false);
      setForm({
        name: "",
        clientId: "",
        startDate: "",
        endDate: "",
        budget: "",
        currency: "EGP",
        objective: "",
        status: "PLANNED",
      });
      await fetchCampaigns(agencyId);
    } catch (err: any) {
      setError(err?.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Campaigns, budgets, schedules and project exposure.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns/new" className="hidden md:inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New campaign
          </Link>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 md:hidden"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <FileText className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Layers} label="Campaigns" value={String(stats.campaignsCount)} />
        <Metric icon={DollarSign} label="Total budget" value={currency(stats.totalBudget)} tone="blue" />
        <Metric icon={TrendingUp} label="Active" value={`${stats.active} Active`} tone="green" />
        <Metric icon={CalendarClock} label="Avg budget" value={currency(stats.avgBudget)} tone="amber" />
      </section>

      <section className="flex flex-col gap-3 rounded-md border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns, clients or objectives"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none min-w-[160px]">
            <option value="ALL">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none">
            <option value="ALL">All statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 text-right font-semibold">Budget</th>
                <th className="px-4 py-3 text-right font-semibold">Projects</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{c.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{c.objective || "No objective provided."}</div>
                    </td>

                    <td className="px-4 py-4">
                      {c.client ? (
                        <div className="font-medium">{c.client.clientName}</div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <StatusPill status={c.status || "PLANNED"} />
                    </td>

                    <td className="px-4 py-4 text-xs">
                      <div>{c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}</div>
                      <div className="text-muted-foreground">{c.endDate ? `— ${new Date(c.endDate).toLocaleDateString()}` : ""}</div>
                    </td>

                    <td className="px-4 py-4 text-right font-mono">{currency(c.budget || 0, c.currency || "EGP")}</td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-semibold">{c.projectsCount || 0}</div>
                    </td>

                    <td className="px-4 py-4">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition hover:bg-muted">
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleCreateCampaign} className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border bg-background shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b p-6">
              <div>
                <h2 className="text-lg font-semibold">Create campaign</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add campaign name, client, schedule, and budget.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Campaign name">
                  <input required value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>

                <Field label="Client">
                  <select required value={form.clientId} onChange={(e) => updateForm("clientId", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="">Select client</option>
                    {loadingClients ? <option>Loading clients…</option> : clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                  </select>
                </Field>

                <Field label="Status">
                  <select value={form.status} onChange={(e) => updateForm("status", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="PLANNED">Planned</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </Field>

                <Field label="Budget">
                  <div className="flex gap-2">
                    <input type="number" min="0" value={form.budget} onChange={(e) => updateForm("budget", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                    <select value={form.currency} onChange={(e) => updateForm("currency", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none">
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </Field>

                <Field label="Start date">
                  <input type="date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>

                <Field label="End date">
                  <input type="date" value={form.endDate} onChange={(e) => updateForm("endDate", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>

                <Field label="Objective">
                  <textarea value={form.objective} onChange={(e) => updateForm("objective", e.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2" />
                </Field>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t p-6">
              <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-md px-4 text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !agencyId} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create campaign
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({ icon: Icon, label, value, tone = "blue" }: { icon: React.ElementType; label: string; value: string; tone?: "blue" | "green" | "amber"; }) {
  const tones: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50",
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
  };

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = (status || "PLANNED").toUpperCase();
  const className =
    normalized === "CANCELLED"
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized === "COMPLETED"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : normalized === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{normalized}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}