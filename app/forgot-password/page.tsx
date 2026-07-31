"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process request. Please try again.");
        return;
      }

      setSuccessMessage(data.message);
    } catch {
      setError("Terminal connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10 text-[#172033]">
      <div className="w-full max-w-md rounded-md border border-[#d8deea] bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#eaf1ff] text-[#2f6fed]">
            <KeyRound className="h-7 w-7" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6fed]">
            Account Recovery
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Forgot Password</h1>
          <p className="mt-2 text-sm text-[#5e6a7f]">
            Enter your operator email below to receive a secure recovery access link.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#b91c1c]">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6">
            <div className="rounded-md border border-[#bbf7d0] bg-[#f0fdf4] p-5 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[#16a34a]" />
              <h2 className="text-sm font-bold text-[#15803d]">Recovery Link Sent</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#166534]">
                {successMessage}
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2f6fed] text-sm font-bold text-white transition hover:bg-[#245fd2]"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f]">
                Operator email
              </span>
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                disabled={loading}
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff] disabled:opacity-50"
                placeholder="ops@agency.com"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2f6fed] text-sm font-bold text-white transition hover:bg-[#245fd2] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <footer className="mt-8 border-t border-[#d8deea] pt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f] transition hover:text-[#2f6fed]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Access Terminal
          </Link>
        </footer>
      </div>
    </main>
  );
}