"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Globe2,
  Loader2,
  MapPin,
  Rocket,
} from "lucide-react";

type PlanKey = "FREE" | "PRO" | "UNLIMITED";

const PLAN_CONFIG: Record<
  PlanKey,
  {
    label: string;
    description: string;
    features: string[];
  }
> = {
  FREE: {
    label: "Free",
    description: "Start with client, project, task, and basic finance tracking.",
    features: ["5 users", "50 projects", "Basic reporting"],
  },
  PRO: {
    label: "Pro",
    description: "Add geofencing, assets, approvals, and advanced reporting.",
    features: ["20 users", "200 projects", "Geofencing", "Asset access"],
  },
  UNLIMITED: {
    label: "Unlimited",
    description: "For agencies that need scale, API access, and deeper operations.",
    features: ["Unlimited users", "Unlimited projects", "API-ready workflows"],
  },
};

const AGENCY_FIELDS = [
  "Marketing",
  "Media production",
  "Creative design",
  "Software development",
  "Branding",
  "Advertising",
  "Event management",
  "Consulting",
  "Real estate",
  "Construction",
  "Travel and tourism",
  "Other",
];

const normalizePlan = (plan: string | null): PlanKey => {
  if (plan === "PRO" || plan === "UNLIMITED") return plan;
  return "FREE";
};

function AgencyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = normalizePlan(searchParams.get("plan"));
  const plan = PLAN_CONFIG[selectedPlan];
  const [submitting, setSubmitting] = useState(false);
  const [agencyField, setAgencyField] = useState("Media production");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleNext = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    if (payload.field === "Other") {
      payload.field = String(formData.get("otherAgencyField") ?? "").trim();
      delete payload.otherAgencyField;
    }

    sessionStorage.setItem(
      "pending_agency",
      JSON.stringify({
        ...payload,
        plan: selectedPlan,
      })
    );

    router.push("/deploy/operator");
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#172033]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="hidden lg:block">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-[#5e6a7f] transition hover:text-[#172033]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing
          </Link>

          <div className="rounded-md border border-[#d8deea] bg-white p-6 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-[#eaf1ff] text-[#2f6fed]">
              <Rocket className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2f6fed]">Step 01</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Initialize agency workspace.</h1>
            <p className="mt-4 text-sm leading-6 text-[#5e6a7f]">
              This creates the agency shell. The next step creates the admin operator and deploys the
              subscription, departments, categories, reporting period, and audit log.
            </p>

            <div className="mt-8 rounded-md border border-[#d8deea] bg-[#f7f8fb] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e6a7f]">Selected plan</p>
                  <h2 className="mt-1 text-2xl font-black">{plan.label}</h2>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-xs font-bold text-[#2f6fed]">
                  {selectedPlan}
                </span>
              </div>
              <p className="mt-3 text-sm text-[#5e6a7f]">{plan.description}</p>
              <div className="mt-4 grid gap-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm font-semibold">
                    <Check className="h-4 w-4 text-[#16a34a]" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[#d8deea] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6fed]">
              Step 01: Brand Identity ({selectedPlan})
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Initialize Agency</h2>
            <p className="mt-2 text-sm text-[#5e6a7f]">
              Use the legal or operating details your invoices and statements should show.
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-5">
            <Field label="Agency name" icon={Building2}>
              <input
                name="agencyName"
                required
                minLength={2}
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                placeholder="Creative Flow Media"
              />
            </Field>

            <Field label="Agency email" icon={Globe2}>
              <input
                name="agencyEmail"
                type="email"
                required
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                placeholder="billing@agency.com"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number">
                <input
                  name="phoneNumber"
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                  placeholder="+20..."
                />
              </Field>

              <Field label="Agency field">
                <select
                  name="field"
                  value={agencyField}
                  onChange={(event) => setAgencyField(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                >
                  {AGENCY_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {agencyField === "Other" && (
              <Field label="Other agency field">
                <input
                  name="otherAgencyField"
                  required
                  minLength={2}
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                  placeholder="Enter agency field"
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone">
                <select
                  name="timezone"
                  defaultValue="Africa/Cairo"
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none"
                >
                  <option value="Africa/Cairo">Africa/Cairo</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </Field>

              <Field label="Default currency">
                <select
                  name="defaultCurrency"
                  defaultValue="EGP"
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none"
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                </select>
              </Field>
            </div>

            <Field label="Office address" icon={MapPin}>
              <input
                name="address"
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                placeholder="Hurghada, Red Sea"
              />
            </Field>

            <input type="hidden" name="deploymentDate" value={today} />

            <button
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2f6fed] text-sm font-bold text-white transition hover:bg-[#245fd2] disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Continue to Operator Setup
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function AgencySignup() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] text-sm font-semibold text-[#5e6a7f]">
          Loading deployment...
        </main>
      }
    >
      <AgencyForm />
    </Suspense>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      {children}
    </label>
  );
}