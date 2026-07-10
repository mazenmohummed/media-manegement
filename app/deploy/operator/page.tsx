"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type PendingAgency = {
  agencyName: string;
  agencyEmail: string;
  phoneNumber?: string;
  field?: string;
  timezone?: string;
  defaultCurrency?: string;
  address?: string;
  plan: "FREE" | "PRO" | "UNLIMITED";
};

export default function OperatorSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAgency, setPendingAgency] = useState<PendingAgency | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_agency");

    if (!stored) {
      router.replace("/deploy/agency");
      return;
    }

    try {
      setPendingAgency(JSON.parse(stored));
    } catch {
      sessionStorage.removeItem("pending_agency");
      router.replace("/deploy/agency");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingAgency) return;

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const operatorName = String(formData.get("operatorName") || "").trim();
    const operatorEmail = String(formData.get("operatorEmail") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const finalPayload = {
      ...pendingAgency,
      operatorName,
      operatorEmail,
      password,
    };

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        body: JSON.stringify(finalPayload),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || data?.error || "Deployment failed.");
      }

      sessionStorage.removeItem("pending_agency");

      const signInResult = await signIn("credentials", {
        email: operatorEmail,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login?deployed=1");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Deployment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#172033]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <section className="hidden lg:block">
          <Link
            href="/deploy/agency"
            className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-[#5e6a7f] transition hover:text-[#172033]"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit agency details
          </Link>

          <div className="rounded-md border border-[#d8deea] bg-white p-6 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-[#dcfce7] text-[#15803d]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#15803d]">Step 02</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Create admin operator.</h1>
            <p className="mt-4 text-sm leading-6 text-[#5e6a7f]">
              This account becomes the first agency admin. It will own users, clients, projects, invoices,
              statements, approvals, and workspace settings.
            </p>

            <div className="mt-8 rounded-md border border-[#d8deea] bg-[#f7f8fb] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e6a7f]">Pending workspace</p>
              <h2 className="mt-1 text-2xl font-black">{pendingAgency?.agencyName || "Agency"}</h2>
              <div className="mt-3 grid gap-2 text-sm text-[#5e6a7f]">
                <p>{pendingAgency?.agencyEmail}</p>
                <p>Plan: {pendingAgency?.plan || "FREE"}</p>
                <p>
                  {pendingAgency?.timezone || "Africa/Cairo"} / {pendingAgency?.defaultCurrency || "EGP"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[#d8deea] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#15803d]">
              Step 02: Command Access
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Admin Operator</h2>
            <p className="mt-2 text-sm text-[#5e6a7f]">
              Establish credentials for{" "}
              <span className="font-bold text-[#2f6fed]">{pendingAgency?.agencyName || "your agency"}</span>.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" icon={UserRound}>
                <input
                  name="operatorName"
                  required
                  minLength={2}
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                  placeholder="Mazen Sanad"
                />
              </Field>

              <Field label="Admin email" icon={Mail}>
                <input
                  name="operatorEmail"
                  type="email"
                  required
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                  placeholder="admin@agency.com"
                />
              </Field>
            </div>

            <Field label="Master password">
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 pr-11 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5e6a7f] hover:bg-[#f1f4f9]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm password">
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                placeholder="Repeat password"
              />
            </Field>

            <button
              disabled={loading || !pendingAgency}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2f6fed] text-sm font-bold text-white transition hover:bg-[#245fd2] disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Finalize Deployment
            </button>
          </form>
        </section>
      </div>
    </main>
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
