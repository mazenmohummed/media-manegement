"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Rocket, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOnboarding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const agencyName = formData.get("agencyName");

    try {
      // 1. Create the Agency in the Database
      const res = await fetch("/api/agency/onboard", {
        method: "POST",
        body: JSON.stringify({
          agencyName,
          operatorName: session?.user?.name,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        /**
         * 2. REFRESH THE JWT TOKEN
         * We pass the new agency data to update(). 
         * This triggers the 'jwt' callback in authOptions.ts with trigger: "update"
         */
        await update({
          ...session,
          agencyId: data.agencyId,
          agencyName: data.agencyName,
        });

        // 3. SECURE REDIRECT
        // Use window.location.href for a clean hard-redirect to clear middleware cache
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Initialization failed. Check system logs.");
        setLoading(false);
      }
    } catch (err) {
      setError("Network connection unstable. Could not reach the server.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-card/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-border shadow-2xl relative z-10"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600/10 text-blue-600 mb-8 border border-blue-600/20 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
            <Rocket size={40} className={loading ? "animate-pulse" : ""} />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
            Initialize <span className="text-blue-600">OS</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-3 font-medium">
            Deploy your professional workspace to begin operations.
          </p>
        </div>

        <form onSubmit={handleOnboarding} className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-bold uppercase tracking-tight"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">
              Agency Identity / Brand
            </label>
            <input
              name="agencyName"
              required
              disabled={loading}
              autoFocus
              className="w-full bg-muted/30 p-5 rounded-2xl border border-border outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-bold placeholder:font-medium placeholder:opacity-30 text-foreground"
              placeholder="e.g. HURGHADA MEDIA GROUP"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Sequencing...</span>
              </>
            ) : (
              <>
                <span>Finalize Deployment</span>
                <Rocket size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">
          System v3.0.1 // encrypted handshake
        </p>
      </motion.div>
    </div>
  );
}