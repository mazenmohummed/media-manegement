"use client";

import { useState } from "react";
import { Loader2, UserPlus, Building, Mail, Phone, Globe, ShieldAlert, DollarSign } from "lucide-react";

interface CreateClientCardProps {
  agencyId: string;
  opportunityId?: string; // Optional link if creating from an opportunity/Kanban view
  onSuccess?: (newClient: any) => void;
  onCancel?: () => void;
}

export default function CreateClientCard({
  agencyId,
  opportunityId,
  onSuccess,
  onCancel,
}: CreateClientCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientName: "",
    accountType: "Retainer",
    relationshipType: "RECURRING" as "RECURRING" | "ONE_TIME",
    status: "ACTIVE",
    email: "",
    phoneNumber: "",
    website: "",
    notes: "",
    // Billing Address
    billingLine1: "",
    billingCity: "",
    billingCountry: "Egypt",
    // Primary Contact
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    // Portal User Section
    createUser: true,
    userName: "",
    userEmail: "",
    userPassword: "Client@123456",
    // Credit terms
    creditLimit: "",
    creditLimitAlertPct: "",
    isOnCreditHold: false,
    creditHoldReason: "",
    // Initial Budget & Period
    budgetAmount: "",
    currency: "EGP",
    budgetPeriodStart: "",
    budgetPeriodEnd: "",
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        agencyId,
        opportunityId: opportunityId || null,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : null,
        creditLimitAlertPct: formData.creditLimitAlertPct ? Number(formData.creditLimitAlertPct) : null,
        budgetAmount: formData.budgetAmount ? Number(formData.budgetAmount) : null,
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
      if (!res.ok) throw new Error(data.error || "Failed to create client account");

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border bg-background shadow-xl text-foreground"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b p-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Create client
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add account, portal user, contact, billing, credit, and budget details.
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
            >
              Close
            </button>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 text-xs bg-red-950/40 border border-red-900/50 text-red-300 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Account Details */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client Account
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Client name *</label>
                <input
                  required
                  value={formData.clientName}
                  onChange={(event) => updateForm("clientName", event.target.value)}
                  placeholder="e.g. Red Sea Diving Hub"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account type</label>
                <select
                  value={formData.accountType}
                  onChange={(event) => updateForm("accountType", event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="Retainer">Retainer</option>
                  <option value="One-off">One-off</option>
                  <option value="Project">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Relationship</label>
                <select
                  value={formData.relationshipType}
                  onChange={(event) => updateForm("relationshipType", event.target.value as "RECURRING" | "ONE_TIME")}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="RECURRING">Recurring</option>
                  <option value="ONE_TIME">One time</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Billing email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="billing@company.com"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <input
                  value={formData.phoneNumber}
                  onChange={(event) => updateForm("phoneNumber", event.target.value)}
                  placeholder="+20 100 000 0000"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Website</label>
                <input
                  value={formData.website}
                  onChange={(event) => updateForm("website", event.target.value)}
                  placeholder="https://company.com"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Client Portal User Section */}
          <div className="rounded-md border p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold">Create Client Portal User</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createUser}
                  onChange={(e) => updateForm("createUser", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Enable Access (Role: CLIENT)
              </label>
            </div>

            {formData.createUser && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">User Full Name</label>
                  <input
                    placeholder={formData.contactName || formData.clientName || "Client User Name"}
                    value={formData.userName}
                    onChange={(event) => updateForm("userName", event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">User Login Email</label>
                  <input
                    type="email"
                    required={formData.createUser}
                    placeholder={formData.contactEmail || formData.email || "user@client.com"}
                    value={formData.userEmail}
                    onChange={(event) => updateForm("userEmail", event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Password (Optional - defaults to Client@123456)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.userPassword}
                    onChange={(event) => updateForm("userPassword", event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Contact & Billing */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact & Address Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Primary contact name</label>
                <input
                  value={formData.contactName}
                  onChange={(event) => updateForm("contactName", event.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contact title</label>
                <input
                  value={formData.contactTitle}
                  onChange={(event) => updateForm("contactTitle", event.target.value)}
                  placeholder="e.g. Operations Manager"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contact email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(event) => updateForm("contactEmail", event.target.value)}
                  placeholder="john@company.com"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contact phone</label>
                <input
                  value={formData.contactPhone}
                  onChange={(event) => updateForm("contactPhone", event.target.value)}
                  placeholder="+20 101 111 1111"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Billing address</label>
                <input
                  value={formData.billingLine1}
                  onChange={(event) => updateForm("billingLine1", event.target.value)}
                  placeholder="Street address"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
                <input
                  value={formData.billingCity}
                  onChange={(event) => updateForm("billingCity", event.target.value)}
                  placeholder="City"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                <input
                  value={formData.billingCountry}
                  onChange={(event) => updateForm("billingCountry", event.target.value)}
                  placeholder="Country"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Credit & Budget */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Credit & Financial Budget
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Credit limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(event) => updateForm("creditLimit", event.target.value)}
                  placeholder="50000"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Credit alert %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.creditLimitAlertPct}
                  onChange={(event) => updateForm("creditLimitAlertPct", event.target.value)}
                  placeholder="80"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isOnCreditHold}
                  onChange={(event) => updateForm("isOnCreditHold", event.target.checked)}
                />
                Credit hold
              </label>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Credit hold reason</label>
                <input
                  value={formData.creditHoldReason}
                  onChange={(event) => updateForm("creditHoldReason", event.target.value)}
                  placeholder="Reason if applicable"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Budget amount</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budgetAmount}
                  onChange={(event) => updateForm("budgetAmount", event.target.value)}
                  placeholder="25000"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(event) => updateForm("currency", event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Budget start</label>
                <input
                  type="date"
                  value={formData.budgetPeriodStart}
                  onChange={(event) => updateForm("budgetPeriodStart", event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Budget end</label>
                <input
                  type="date"
                  value={formData.budgetPeriodEnd}
                  onChange={(event) => updateForm("budgetPeriodEnd", event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Additional context or account notes..."
                  className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t p-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-md px-4 text-sm font-semibold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !agencyId}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 shadow-lg"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create client
          </button>
        </div>
      </form>
    </div>
  );
}