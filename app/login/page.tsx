"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

type LoginUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  agencyId: string;
  agencyName: string;
  departmentName: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message ?? "Invalid credentials. Access denied.");
        return;
      }

      const user = data.user as LoginUser;
      sessionStorage.setItem("agency_user", JSON.stringify(user));

      if (user.role === "SUPERADMIN") {
        router.push("/superadmin");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch {
      setError("Terminal connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10 text-[#172033]">
      <div className="w-full max-w-md rounded-md border border-[#d8deea] bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#eaf1ff] text-[#2f6fed]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6fed]">
            Identity Verification
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Access Terminal</h1>
          <p className="mt-2 text-sm text-[#5e6a7f]">
            Sign in with an active operator account connected to your agency.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#b91c1c]">
            {error}
          </div>
        )}

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
              className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
              placeholder="ops@agency.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f]">
              Access password
            </span>
            <span className="relative block">
              <input
                name="password"
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-11 w-full rounded-md border border-[#d8deea] bg-white px-3 pr-11 text-sm outline-none transition focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dbe7ff]"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5e6a7f] transition hover:bg-[#f0f4fb] hover:text-[#2f6fed]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <button
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2f6fed] text-sm font-bold text-white transition hover:bg-[#245fd2] disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Authenticating..." : "Authorize Access"}
          </button>
        </form>

        <footer className="mt-8 border-t border-[#d8deea] pt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f]">
            New operator?{" "}
            <Link href="/deploy/agency" className="text-[#2f6fed] transition hover:text-[#245fd2]">
              Deploy agency
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
