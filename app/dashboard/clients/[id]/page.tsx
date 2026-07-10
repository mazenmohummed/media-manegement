"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Mail,
  Phone,
  PlusCircle,
  Receipt,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

const DEFAULT_AGENCY_ID = "cmqv7pkzo0000xmkk0u7229sf";

type ClientDetail = {
  id: string;
  clientNo?: string | null;
  clientName: string;
  accountType?: string | null;
  status: string;
  relationshipType: "ONE_TIME" | "RECURRING";
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  notes?: string | null;
  billingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  creditLimit?: number | null;
  outstandingBalance: number;
  isOnCreditHold: boolean;
  creditHoldReason?: string | null;
  creditLimitAlertPct?: number | null;
  primaryContact?: {
    id: string;
    name: string;
    title?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  projects: Array<{
    id: string;
    projectNo?: string | null;
    projectName: string;
    status: string;
    totalValue: number;
    currency: string;
    invoiceNo?: string | null;
    invoiceStatus: string;
    targetDeadline?: string | null;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    currency: string;
    issuedAt?: string | null;
    dueDate?: string | null;
    projectId?: string | null;
  }>;
  payments: Array<{
    id: string;
    paymentNo?: string | null;
    amount: number;
    currency: string;
    method: string;
    datePaid: string;
    description?: string | null;
    referenceNo?: string | null;
    projectId?: string | null;
    invoiceId?: string | null;
  }>;
  activeBudget?: {
    totalAmount: number;
    spentAmount: number;
    remainingAmount: number;
    currency: string;
    periodEnd: string;
  } | null;
  totals: {
    totalProjectValue: number;
    totalInvoiced: number;
    totalPaid: number;
    totalDue: number;
    unappliedCredit: number;
    projectCount: number;
    invoiceCount: number;
    paymentCount: number;
  };
};

type EditData = {
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
  creditLimit: string;
  isOnCreditHold: boolean;
  creditHoldReason: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  primaryContactId: string;
};

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

const currency = (value: number, code = "EGP") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value || 0);

const statusClass = (status: string) => {
  const normalized = status?.toUpperCase();
  if (normalized === "PAID" || normalized === "ACTIVE" || normalized === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "OVERDUE" || normalized === "CREDIT HOLD" || normalized === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized === "PARTIALLY_PAID" || normalized === "SENT" || normalized === "ON_HOLD") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [agencyId, setAgencyId] = useState("");
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    clientName: "",
    accountType: "",
    status: "ACTIVE",
    relationshipType: "ONE_TIME",
    email: "",
    phoneNumber: "",
    website: "",
    notes: "",
    billingLine1: "",
    billingCity: "",
    billingCountry: "",
    creditLimit: "",
    isOnCreditHold: false,
    creditHoldReason: "",
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    primaryContactId: "",
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "CASH",
    invoiceId: "",
    projectId: "",
    datePaid: new Date().toISOString().slice(0, 10),
  });

  const fetchClient = async (activeAgencyId = agencyId) => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/clients/${id}?agencyId=${encodeURIComponent(activeAgencyId)}`, {
        cache: "no-store",
        credentials: "include",
        headers: { "x-agency-id": activeAgencyId },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load client");
      }

      setClient(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load client");
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryAgencyId =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("agencyId") ?? "";
    const resolvedAgencyId = queryAgencyId || getStoredAgencyId() || DEFAULT_AGENCY_ID;

    setAgencyId(resolvedAgencyId);
    fetchClient(resolvedAgencyId);
  }, [id]);

  const paymentTargetOptions = useMemo(() => {
    if (!client) return [];

    return client.invoices.map((invoice) => {
      const project = client.projects.find((item) => item.id === invoice.projectId);

      return {
        invoiceId: invoice.id,
        projectId: invoice.projectId ?? "",
        label: `${invoice.invoiceNo} - ${project?.projectName ?? "Client invoice"} (${currency(
          invoice.balanceDue,
          invoice.currency
        )} due)`,
      };
    });
  }, [client]);

  const openEdit = () => {
    if (!client) return;

    setEditData({
      clientName: client.clientName ?? "",
      accountType: client.accountType ?? "",
      status: client.status ?? "ACTIVE",
      relationshipType: client.relationshipType ?? "ONE_TIME",
      email: client.email ?? "",
      phoneNumber: client.phoneNumber ?? "",
      website: client.website ?? "",
      notes: client.notes ?? "",
      billingLine1: client.billingAddress?.line1 ?? "",
      billingCity: client.billingAddress?.city ?? "",
      billingCountry: client.billingAddress?.country ?? "",
      creditLimit: client.creditLimit ? String(client.creditLimit) : "",
      isOnCreditHold: Boolean(client.isOnCreditHold),
      creditHoldReason: client.creditHoldReason ?? "",
      contactName: client.primaryContact?.name ?? "",
      contactTitle: client.primaryContact?.title ?? "",
      contactEmail: client.primaryContact?.email ?? "",
      contactPhone: client.primaryContact?.phoneNumber ?? "",
      primaryContactId: client.primaryContact?.id ?? "",
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/clients/${id}?agencyId=${encodeURIComponent(agencyId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify({
          ...editData,
          agencyId,
          creditLimit: editData.creditLimit ? Number(editData.creditLimit) : null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Modification failed");
      }

      setShowEditModal(false);
      await fetchClient(agencyId);
    } catch (err: any) {
      setError(err?.message || "Modification failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!client || !paymentData.amount || Number(paymentData.amount) <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    setIsRecording(true);
    setError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify({
          agencyId,
          clientId: client.id,
          invoiceId: paymentData.invoiceId || undefined,
          projectId: paymentData.projectId || undefined,
          amount: Number(paymentData.amount),
          method: paymentData.method,
          datePaid: new Date(paymentData.datePaid).toISOString(),
          description: "Client payment recorded from client detail page",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Payment failed");
      }

      setShowPaymentModal(false);
      setPaymentData({
        amount: "",
        method: "CASH",
        invoiceId: "",
        projectId: "",
        datePaid: new Date().toISOString().slice(0, 10),
      });
      await fetchClient(agencyId);
    } catch (err: any) {
      setError(err?.message || "Payment failed");
    } finally {
      setIsRecording(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </main>
    );
  }

  if (!client) {
    return (
      <main className="space-y-4">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Client not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition hover:bg-muted"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <PlusCircle className="h-4 w-4" />
            Record payment
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <section className="rounded-md border bg-card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={client.isOnCreditHold ? "CREDIT HOLD" : client.status} />
              <span className="text-xs font-semibold text-muted-foreground">{client.clientNo || "No ref"}</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{client.clientName}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {client.email && <Info icon={Mail} value={client.email} />}
              {client.phoneNumber && <Info icon={Phone} value={client.phoneNumber} />}
              {client.website && <Info icon={Globe2} value={client.website} />}
            </div>
          </div>

          <div className="grid min-w-64 gap-2 rounded-md border bg-background p-4 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Account</span>
              <strong>{client.accountType || "Unassigned"}</strong>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Relationship</span>
              <strong>{client.relationshipType === "RECURRING" ? "Recurring" : "One time"}</strong>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Credit limit</span>
              <strong>{client.creditLimit ? currency(client.creditLimit) : "Open"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Briefcase} label="Project value" value={currency(client.totals.totalProjectValue)} />
        <Metric icon={Receipt} label="Invoiced" value={currency(client.totals.totalInvoiced)} />
        <Metric icon={Wallet} label="Collected" value={currency(client.totals.totalPaid)} tone="green" />
        <Metric icon={Banknote} label="Due" value={currency(client.totals.totalDue)} tone="amber" />
        <Metric icon={Activity} label="Projects" value={client.totals.projectCount.toLocaleString()} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Panel title="Primary Contact" icon={UserRound}>
            {client.primaryContact ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{client.primaryContact.name}</p>
                {client.primaryContact.title && <p className="text-muted-foreground">{client.primaryContact.title}</p>}
                {client.primaryContact.email && <Info icon={Mail} value={client.primaryContact.email} />}
                {client.primaryContact.phoneNumber && <Info icon={Phone} value={client.primaryContact.phoneNumber} />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No primary contact saved.</p>
            )}
          </Panel>

          <Panel title="Billing" icon={Building2}>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{client.billingAddress?.line1 || "No billing address saved."}</p>
              {(client.billingAddress?.city || client.billingAddress?.country) && (
                <p>
                  {[client.billingAddress?.city, client.billingAddress?.country].filter(Boolean).join(", ")}
                </p>
              )}
              {client.activeBudget && (
                <p className="pt-2 font-semibold text-foreground">
                  Budget remaining {currency(client.activeBudget.remainingAmount, client.activeBudget.currency)}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Invoice Register" icon={Receipt}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-3 font-semibold">Invoice</th>
                  <th className="py-3 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Total</th>
                  <th className="py-3 text-right font-semibold">Paid</th>
                  <th className="py-3 text-right font-semibold">Due</th>
                  <th className="py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {client.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No invoices generated for this client.
                    </td>
                  </tr>
                ) : (
                  client.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-4">
                        <div className="font-semibold">{invoice.invoiceNo}</div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "Not issued"}
                        </div>
                      </td>
                      <td className="py-4">
                        <StatusPill status={invoice.status} />
                      </td>
                      <td className="py-4 text-right font-mono">{currency(invoice.totalAmount, invoice.currency)}</td>
                      <td className="py-4 text-right font-mono text-emerald-700">
                        {currency(invoice.amountPaid, invoice.currency)}
                      </td>
                      <td className="py-4 text-right font-mono text-amber-700">
                        {currency(invoice.balanceDue, invoice.currency)}
                      </td>
                      <td className="py-4 text-right">
                        {invoice.projectId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/projects/${invoice.projectId}/invoice`)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition hover:bg-muted"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Client invoice</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Projects" icon={Briefcase}>
          <div className="space-y-3">
            {client.projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No projects initialized.</p>
            ) : (
              client.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-md border p-4 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <p className="font-semibold">{project.projectName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{project.projectNo || project.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{currency(project.totalValue, project.currency)}</p>
                    <StatusPill status={project.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Payments" icon={DollarSign}>
          <div className="space-y-3">
            {client.payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              client.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-4 rounded-md border p-4">
                  <div>
                    <p className="font-semibold">{payment.paymentNo || "Payment"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {payment.method.replaceAll("_", " ")} - {new Date(payment.datePaid).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-emerald-700">
                    {currency(payment.amount, payment.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      {showPaymentModal && (
        <Modal title="Record Payment" onClose={() => setShowPaymentModal(false)}>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <Field label="Target invoice">
              <select
                value={paymentData.invoiceId}
                onChange={(event) => {
                  const option = paymentTargetOptions.find((item) => item.invoiceId === event.target.value);
                  setPaymentData({
                    ...paymentData,
                    invoiceId: event.target.value,
                    projectId: option?.projectId ?? "",
                  });
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              >
                <option value="">Unapplied client payment</option>
                {paymentTargetOptions.map((option) => (
                  <option key={option.invoiceId} value={option.invoiceId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={paymentData.amount}
                onChange={(event) => setPaymentData({ ...paymentData, amount: event.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </Field>
            <Field label="Payment method">
              <select
                value={paymentData.method}
                onChange={(event) => setPaymentData({ ...paymentData, method: event.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CARD">Card</option>
                <option value="STRIPE">Stripe</option>
                <option value="CHECK">Check</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Date paid">
              <input
                type="date"
                value={paymentData.datePaid}
                onChange={(event) => setPaymentData({ ...paymentData, datePaid: event.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </Field>
            <button
              disabled={isRecording}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {isRecording && <Loader2 className="h-4 w-4 animate-spin" />}
              Save payment
            </button>
          </form>
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Edit Client" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleUpdateClient} className="grid gap-4 md:grid-cols-2">
            <Field label="Client name">
              <input required value={editData.clientName} onChange={(event) => setEditData({ ...editData, clientName: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Account type">
              <select value={editData.accountType} onChange={(event) => setEditData({ ...editData, accountType: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="Retainer">Retainer</option>
                <option value="One-off">One-off</option>
                <option value="Project">Project</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={editData.status} onChange={(event) => setEditData({ ...editData, status: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>
            <Field label="Relationship">
              <select value={editData.relationshipType} onChange={(event) => setEditData({ ...editData, relationshipType: event.target.value as EditData["relationshipType"] })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="ONE_TIME">One time</option>
                <option value="RECURRING">Recurring</option>
              </select>
            </Field>
            <Field label="Email">
              <input type="email" value={editData.email} onChange={(event) => setEditData({ ...editData, email: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Phone">
              <input value={editData.phoneNumber} onChange={(event) => setEditData({ ...editData, phoneNumber: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Website">
              <input value={editData.website} onChange={(event) => setEditData({ ...editData, website: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Credit limit">
              <input type="number" min="0" value={editData.creditLimit} onChange={(event) => setEditData({ ...editData, creditLimit: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Billing address">
              <input value={editData.billingLine1} onChange={(event) => setEditData({ ...editData, billingLine1: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Billing city">
              <input value={editData.billingCity} onChange={(event) => setEditData({ ...editData, billingCity: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Primary contact">
              <input value={editData.contactName} onChange={(event) => setEditData({ ...editData, contactName: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <Field label="Contact email">
              <input type="email" value={editData.contactEmail} onChange={(event) => setEditData({ ...editData, contactEmail: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
              <input type="checkbox" checked={editData.isOnCreditHold} onChange={(event) => setEditData({ ...editData, isOnCreditHold: event.target.checked })} />
              Credit hold
            </label>
            <Field label="Hold reason">
              <input value={editData.creditHoldReason} onChange={(event) => setEditData({ ...editData, creditHoldReason: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </Field>
            <div className="md:col-span-2">
              <button
                disabled={isUpdating}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

function Info({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      {value}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusClass(status)}`}>
      {status.replaceAll("_", " ")}
    </span>
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

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em]">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
