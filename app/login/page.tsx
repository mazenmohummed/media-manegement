// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // Prevent auto-redirect to handle errors manually
    });

    if (res?.error) {
      setError("Invalid credentials. Access denied.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh(); // Ensure session state updates globally
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="bg-card p-10 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-border relative z-10">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">
            Access Terminal
          </h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">
            Identity Verification Required
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Operator Email
            </label>
            <input 
              name="email"
              required
              type="email" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground" 
              placeholder="ops@agency.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Access Password
            </label>
            <input 
              name="password"
              required
              type="password" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground" 
              placeholder="••••••••"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl shadow-blue-500/20 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Authenticating...
              </>
            ) : (
              "Authorize Access"
            )}
          </button>
        </form>

        <footer className="mt-10 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            New Operator?{" "}
            <Link href="/deploy/agency" className="text-blue-600 hover:text-blue-500 transition-colors">
              Deploy Agency
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}