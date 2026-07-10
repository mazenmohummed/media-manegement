"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarClock,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

const DEFAULT_AGENCY_ID = "cmqv7pkzo0000xmkk0u7229sf";

type ClientRow = {
  id: string;
  clientNo?: string | null;
  clientName: string;
  accountType?: string | null;
  status?: string | null;
  relationshipType?: "ONE_TIME" | "RECURRING";
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  creditLimit?: number | null;
  outstandingBalance?: number;
  isOnCreditHold?: boolean;
  createdAt: string;
  primaryContact?: {
    name: string;
    title?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  projectCount: number;
  openProjects: number;
  invoiceCount: number;
  totalInvoiced: number;
  totalReceived: number;
  totalDue: number;
  overdueAmount: number;
  unappliedCredit: number;
  activeBudget?: {
    totalAmount: number;
    spentAmount: number;
    remainingAmount: number;
    currency: string;
    periodEnd: string;
  } | null;
  latestStatement?: {
    id: string;
    statementNo: string;
    periodEnd: string;
    closingBalance: number;
  } | null;
};

type ClientForm = {
  clientName: string;
  accountType: string;
  status: string;
  relationshipType: "ONE_TIME" | "RECURRING";
  email: string;
  phoneNumber: string;
  website: string;
  notes: string;
  billingLine1: string;
  billingCity: string;
  billingCountry: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  creditLimit: string;
  isOnCreditHold: boolean;
  creditHoldReason: string;
  creditLimitAlertPct: string;
  budgetAmount: string;
  budgetPeriodStart: string;
  budgetPeriodEnd: string;
  currency: string;
};

const DEFAULT_FORM: ClientForm = {
  clientName: "",
  accountType: "Retainer",
  status: "ACTIVE",
  relationshipType: "RECURRING",
  email: "",
  phoneNumber: "",
  website: "",
  notes: "",
  billingLine1: "",
  billingCity: "",
  billingCountry: "Egypt",
  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",
  creditLimit: "",
  isOnCreditHold: false,
  creditHoldReason: "",
  creditLimitAlertPct: "90",
  budgetAmount: "",
  budgetPeriodStart: "",
  budgetPeriodEnd: "",
  currency: "EGP",
};

const currency = (value: number, code = "EGP") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value || 0);

const percent = (value: number) =>
  `${Math.min(Math.max(value || 0, 0), 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}%`;

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

export default function ClientsPage() {
  const [agencyId, setAgencyId] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [formData, setFormData] = useState<ClientForm>(DEFAULT_FORM);

  const fetchClients = async (activeAgencyId = agencyId) => {
    setLoading(true);
    setError("");

    if (!activeAgencyId) {
      setLoading(false);
      setError("No agency context found. Please sign in again.");
      return;
    }

    try {
      const res = await fetch(`/api/clients?agencyId=${encodeURIComponent(activeAgencyId)}`, {
        cache: "no-store",
        credentials: "include",
        headers: { "x-agency-id": activeAgencyId },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load clients");
      }

      setClients(Array.isArray(data) ? data : data.clients ?? []);
    } catch (err: any) {
      setError(err?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryAgencyId =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("agencyId") ?? "";
    const storedAgencyId = getStoredAgencyId();
    const resolvedAgencyId = queryAgencyId || storedAgencyId || DEFAULT_AGENCY_ID;

    setAgencyId(resolvedAgencyId);
    fetchClients(resolvedAgencyId);
  }, []);

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.clientName.toLowerCase().includes(query) ||
        client.clientNo?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.primaryContact?.name.toLowerCase().includes(query);

      const matchesType =
        selectedType === "ALL" ||
        client.accountType?.toUpperCase() === selectedType ||
        client.relationshipType === selectedType;

      const matchesStatus =
        selectedStatus === "ALL" || client.status?.toUpperCase() === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [clients, searchTerm, selectedType, selectedStatus]);

  const stats = useMemo(
    () =>
      clients.reduce(
        (acc, client) => ({
          totalClients: acc.totalClients + 1,
          totalInvoiced: acc.totalInvoiced + client.totalInvoiced,
          totalReceived: acc.totalReceived + client.totalReceived,
          totalDue: acc.totalDue + client.totalDue,
          overdueAmount: acc.overdueAmount + client.overdueAmount,
          openProjects: acc.openProjects + client.openProjects,
        }),
        {
          totalClients: 0,
          totalInvoiced: 0,
          totalReceived: 0,
          totalDue: 0,
          overdueAmount: 0,
          openProjects: 0,
        }
      ),
    [clients]
  );

  const collectionRate = stats.totalInvoiced
    ? (stats.totalReceived / stats.totalInvoiced) * 100
    : 0;

  const updateForm = <Key extends keyof ClientForm>(key: Key, value: ClientForm[Key]) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleAddClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        ...formData,
        agencyId,
        budgetAmount: formData.budgetAmount ? Number(formData.budgetAmount) : undefined,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        creditLimitAlertPct: formData.creditLimitAlertPct ? Number(formData.creditLimitAlertPct) : 90,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create client");
      }

      setShowForm(false);
      setFormData(DEFAULT_FORM);
      await fetchClients(agencyId);
    } catch (err: any) {
      setError(err?.message || "Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts, contacts, budgets, balances, and project exposure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New client
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Building2} label="Clients" value={stats.totalClients.toLocaleString()} />
        <Metric icon={Receipt} label="Invoiced" value={currency(stats.totalInvoiced)} />
        <Metric icon={Wallet} label="Collected" value={currency(stats.totalReceived)} tone="green" />
        <Metric icon={Banknote} label="Outstanding" value={currency(stats.totalDue)} tone="amber" />
        <Metric icon={CalendarClock} label="Collection rate" value={percent(collectionRate)} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search clients, refs, contacts, or emails"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </span>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
          >
            <option value="ALL">All types</option>
            <option value="RETAINER">Retainer</option>
            <option value="ONE-OFF">One-off</option>
            <option value="PROJECT">Project</option>
            <option value="RECURRING">Recurring</option>
            <option value="ONE_TIME">One time</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Projects</th>
                <th className="px-4 py-3 text-right font-semibold">Invoiced</th>
                <th className="px-4 py-3 text-right font-semibold">Collected</th>
                <th className="px-4 py-3 text-right font-semibold">Due</th>
                <th className="px-4 py-3 text-right font-semibold">Credit</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    No clients found.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{client.clientName}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{client.clientNo || "No ref"}</span>
                        {client.email && <span>{client.email}</span>}
                        {client.phoneNumber && <span>{client.phoneNumber}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {client.primaryContact ? (
                        <div>
                          <div className="font-medium">{client.primaryContact.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.primaryContact.email || client.primaryContact.phoneNumber || "Primary contact"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No contact</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{client.accountType || "Unassigned"}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.relationshipType === "RECURRING" ? "Recurring" : "One time"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{client.projectCount}</div>
                      <div className="text-xs text-muted-foreground">{client.openProjects} open</div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono">{currency(client.totalInvoiced)}</td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-700">
                      {currency(client.totalReceived)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-amber-700">
                      {currency(client.totalDue)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono">
                      {client.creditLimit ? currency(client.creditLimit) : "Open"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={client.isOnCreditHold ? "CREDIT HOLD" : client.status || "ACTIVE"} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition hover:bg-muted"
                      >
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
          <form
            onSubmit={handleAddClient}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border bg-background shadow-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b p-6">
              <div>
                <h2 className="text-lg font-semibold">Create client</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add account, contact, billing, credit, and budget details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Client name">
                  <input required value={formData.clientName} onChange={(event) => updateForm("clientName", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Account type">
                  <select value={formData.accountType} onChange={(event) => updateForm("accountType", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="Retainer">Retainer</option>
                    <option value="One-off">One-off</option>
                    <option value="Project">Project</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={formData.status} onChange={(event) => updateForm("status", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </Field>
                <Field label="Relationship">
                  <select value={formData.relationshipType} onChange={(event) => updateForm("relationshipType", event.target.value as ClientForm["relationshipType"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="RECURRING">Recurring</option>
                    <option value="ONE_TIME">One time</option>
                  </select>
                </Field>
                <Field label="Billing email">
                  <input type="email" value={formData.email} onChange={(event) => updateForm("email", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Phone">
                  <input value={formData.phoneNumber} onChange={(event) => updateForm("phoneNumber", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Website">
                  <input value={formData.website} onChange={(event) => updateForm("website", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Billing address">
                  <input value={formData.billingLine1} onChange={(event) => updateForm("billingLine1", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="City">
                  <input value={formData.billingCity} onChange={(event) => updateForm("billingCity", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Country">
                  <input value={formData.billingCountry} onChange={(event) => updateForm("billingCountry", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Primary contact">
                  <input value={formData.contactName} onChange={(event) => updateForm("contactName", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Contact title">
                  <input value={formData.contactTitle} onChange={(event) => updateForm("contactTitle", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Contact email">
                  <input type="email" value={formData.contactEmail} onChange={(event) => updateForm("contactEmail", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Contact phone">
                  <input value={formData.contactPhone} onChange={(event) => updateForm("contactPhone", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Credit limit">
                  <input type="number" min="0" value={formData.creditLimit} onChange={(event) => updateForm("creditLimit", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Credit alert %">
                  <input type="number" min="0" max="100" value={formData.creditLimitAlertPct} onChange={(event) => updateForm("creditLimitAlertPct", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                  <input type="checkbox" checked={formData.isOnCreditHold} onChange={(event) => updateForm("isOnCreditHold", event.target.checked)} />
                  Credit hold
                </label>
                <Field label="Credit hold reason">
                  <input value={formData.creditHoldReason} onChange={(event) => updateForm("creditHoldReason", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Budget amount">
                  <input type="number" min="0" value={formData.budgetAmount} onChange={(event) => updateForm("budgetAmount", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Currency">
                  <select value={formData.currency} onChange={(event) => updateForm("currency", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AED">AED</option>
                  </select>
                </Field>
                <Field label="Budget start">
                  <input type="date" value={formData.budgetPeriodStart} onChange={(event) => updateForm("budgetPeriodStart", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Budget end">
                  <input type="date" value={formData.budgetPeriodEnd} onChange={(event) => updateForm("budgetPeriodEnd", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500" />
                </Field>
                <Field label="Notes">
                  <textarea value={formData.notes} onChange={(event) => updateForm("notes", event.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2" />
                </Field>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t p-6">
              <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-md px-4 text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !agencyId} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create client
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber";
}) {
  const tones = {
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
  const normalized = status.toUpperCase();
  const className =
    normalized === "CREDIT HOLD" || normalized === "SUSPENDED"
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized === "COMPLETED"
        ? "border-slate-200 bg-slate-50 text-slate-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
