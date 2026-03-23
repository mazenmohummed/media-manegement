"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();

      if (res.ok) {
        // In a real app, you'd handle cookies/JWT here. 
        // For now, we redirect to the dashboard.
        router.push("/dashboard");
      } else {
        setError(result.message || "Authentication Failed");
      }
    } catch (err) {
      setError("System connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card p-10 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-border relative z-10">
        <header className="mb-10 text-center md:text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
            Agency OS v3.0
          </div>
          <h2 className="text-4xl font-black text-foreground mb-2 tracking-tight uppercase">
            Systems Entry
          </h2>
          <p className="text-muted-foreground font-medium">
            Authenticate to access the production pipeline.
          </p>
        </header>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider text-center">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Command Email
            </label>
            <input 
              name="email"
              type="email" 
              required
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground placeholder:text-muted-foreground/50" 
              placeholder="operator@agency.com" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Access Key
              </label>
              <Link href="#" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                Forgot?
              </Link>
            </div>
            <input 
              name="password"
              type="password" 
              required
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground placeholder:text-muted-foreground/50" 
              placeholder="••••••••••••" 
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl shadow-blue-500/20 mt-4"
          >
            {loading ? "Verifying..." : "Initialize Session"}
          </button>
        </form>
        
        <footer className="mt-10 pt-8 border-t border-border">
          <p className="text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
            New to the grid?{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-500 transition-colors">
              Create Account
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}